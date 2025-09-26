(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.diagrams_behavior = factory();
  }
})(this, function () {
  /**
   * @param [scrollingEnabled=true] {boolean} - Is the scrolling from a non-terminal usage to it's definition
   * enabled. it is enabled by default, but this flow is not relevant in all use cases (playground) and thus
   * it is parametrized.
   */
  function initDiagramsBehavior(scrollingEnabled) {
    if (scrollingEnabled === undefined) {
      scrollingEnabled = true;
    }

    var diagramHeaders = toArr(
      document.getElementsByClassName("diagramHeader"),
    );
    diagramHeaders.forEach(function (header) {
      header.addEventListener(
        "mouseover",
        toggleNonTerminalUsageAndDef_fromHeader,
      );
      header.addEventListener(
        "mouseout",
        toggleNonTerminalUsageAndDef_fromHeader,
      );
    });

    var noneTerminals = toArr(document.getElementsByClassName("non-terminal"));
    var noneTerminalsText = findDomChildrenByTagName(noneTerminals, "text");
    noneTerminalsText.forEach(function (nonTerminal) {
      nonTerminal.addEventListener(
        "mouseover",
        toggleNonTerminalUsageAndDef_fromNoneTerminal,
      );
      nonTerminal.addEventListener(
        "mouseout",
        toggleNonTerminalUsageAndDef_fromNoneTerminal,
      );

      if (scrollingEnabled) {
        nonTerminal.addEventListener("click", jumpToNoneTerminalDef);
      }
    });

    var terminals = toArr(document.getElementsByClassName("terminal"));
    var terminalsText = findDomChildrenByTagName(terminals, "text");
    terminalsText.forEach(function (terminal) {
      terminal.addEventListener("mouseover", toggleTerminalUsage);
      terminal.addEventListener("mouseout", toggleTerminalUsage);
    });
  }

  function toggleTerminalUsage(mouseEvent) {
    var terminalName = mouseEvent.target.getAttribute("label");
    var rects = getUsageSvgRect(terminalName, "terminal", "label");
    toggleClassForNodes(rects, "diagramRectUsage");
  }

  function toggleNonTerminalUsageAndDef_fromNoneTerminal(mouseEvent) {
    var rectsHeaderAndRuleName = getUsageRectAndDefHeader(mouseEvent.target);
    toggleClassForNodes(rectsHeaderAndRuleName.rects, "diagramRectUsage");
    toggleClass(rectsHeaderAndRuleName.header, "diagramHeaderDef");
  }

  function jumpToNoneTerminalDef(mouseEvent) {
    var header = findHeader(mouseEvent.target.getAttribute("rulename"));
    scrollToY(header.offsetTop, 666, "easeInOutQuint");
  }

  function toggleNonTerminalUsageAndDef_fromHeader(mouseEvent) {
    toggleClass(mouseEvent.target, "diagramHeaderDef");
    // this does not work on an svg DOM element so its ok to use innerHTML.
    var definitionName = mouseEvent.target.innerHTML;
    var rects = getUsageSvgRect(definitionName, "non-terminal", "rulename");
    toggleClassForNodes(rects, "diagramRectUsage");
  }

  function getUsageSvgRect(definitionName, className, attributeName) {
    var classDomElements = toArr(document.getElementsByClassName(className));
    var rects = findDomChildrenByTagName(classDomElements, "rect");
    return rects.filter(function (currRect) {
      var textNode = currRect.parentNode.getElementsByTagName("text")[0];
      return textNode.getAttribute(attributeName) === definitionName;
    });
  }

  function findHeader(headerName) {
    var headers = toArr(document.getElementsByClassName("diagramHeader"));
    var header = headers.find(function (currHeader) {
      // this works on H2 dom elements and not SVG elements so innerHTML usage is safe.
      return currHeader.innerHTML === headerName;
    });
    return header;
  }

  function getUsageRectAndDefHeader(target) {
    var headerName = target.getAttribute("rulename");
    var rects = getUsageSvgRect(headerName, "non-terminal", "rulename");
    var header = findHeader(headerName);
    return {
      rects: rects,
      header: header,
      ruleName: headerName,
    };
  }

  // utils

  // IE 10/11 does not support this on svg elements.
  // I'm uncertain I really care... :)
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
  function toggleClass(domNode, className) {
    if (domNode.classList.contains(className)) {
      domNode.classList.remove(className);
    } else {
      domNode.classList.add(className);
    }
  }

  function toggleClassForNodes(domNodes, className) {
    domNodes.forEach(function (currDomNode) {
      toggleClass(currDomNode, className);
    });
  }

  function toArr(htmlCollection) {
    return Array.prototype.slice.call(htmlCollection);
  }

  // first add raf shim
  // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
  var requestAnimFrame = (function () {
    return (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      }
    );
  })();

  // https://stackoverflow.com/questions/8917921/cross-browser-javascript-not-jquery-scroll-to-top-animation
  function scrollToY(scrollTargetY, speed, easing) {
    // scrollTargetY: the target scrollY property of the window
    // speed: time in pixels per second
    // easing: easing equation to use

    var scrollY = window.scrollY,
      scrollTargetY = scrollTargetY || 0,
      speed = speed || 2000,
      easing = easing || "easeOutSine",
      currentTime = 0;

    // min time .1, max time .8 seconds
    var time = Math.max(
      0.1,
      Math.min(Math.abs(scrollY - scrollTargetY) / speed, 0.8),
    );

    // easing equations from https://github.com/danro/easing-js/blob/master/easing.js
    var PI_D2 = Math.PI / 2,
      easingEquations = {
        easeOutSine: function (pos) {
          return Math.sin(pos * (Math.PI / 2));
        },
        easeInOutSine: function (pos) {
          return -0.5 * (Math.cos(Math.PI * pos) - 1);
        },
        easeInOutQuint: function (pos) {
          if ((pos /= 0.5) < 1) {
            return 0.5 * Math.pow(pos, 5);
          }
          return 0.5 * (Math.pow(pos - 2, 5) + 2);
        },
      };

    // add animation loop
    function tick() {
      currentTime += 1 / 60;

      var p = currentTime / time;
      var t = easingEquations[easing](p);

      if (p < 1) {
        requestAnimFrame(tick);

        window.scrollTo(0, scrollY + (scrollTargetY - scrollY) * t);
      } else {
        window.scrollTo(0, scrollTargetY);
      }
    }

    // call it once to get started
    tick();
  }

  function findDomChildrenByTagName(domElements, tagName) {
    var elemsFound = [];
    domElements.forEach(function (currDomNode) {
      toArr(currDomNode.children).forEach(function (currChild) {
        if (currChild.tagName === tagName) {
          elemsFound.push(currChild);
        }
      });
    });
    return elemsFound;
  }
  return {
    initDiagramsBehavior: initDiagramsBehavior,
  };
});
