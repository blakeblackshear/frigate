/*
 Railroad Diagrams
 by Tab Atkins Jr. (and others)
 http://xanthir.com
 http://twitter.com/tabatkins
 http://github.com/tabatkins/railroad-diagrams

 This document and all associated files in the github project are licensed under CC0: http://creativecommons.org/publicdomain/zero/1.0/
 This means you can reuse, remix, or otherwise appropriate this project for your own use WITHOUT RESTRICTION.
 (The actual legal meaning can be found at the above link.)
 Don't ask me for permission to use any part of this project, JUST USE IT.
 I would appreciate attribution, but that is not required by the license.
 */

/*
 This file uses a module pattern to avoid leaking names into the global scope.
 The only accidental leakage is the name "temp".
 The exported names can be found at the bottom of this file;
 simply change the names in the array of strings to change what they are called in your application.

 As well, several configuration constants are passed into the module function at the bottom of this file.
 At runtime, these constants can be found on the Diagram class.
 */

(function (options) {
  function subclassOf(baseClass, superClass) {
    baseClass.prototype = Object.create(superClass.prototype);
    baseClass.prototype.$super = superClass.prototype;
  }

  function unnull(/* children */) {
    return [].slice.call(arguments).reduce(function (sofar, x) {
      return sofar !== undefined ? sofar : x;
    });
  }

  function determineGaps(outer, inner) {
    var diff = outer - inner;
    switch (Diagram.INTERNAL_ALIGNMENT) {
      case "left":
        return [0, diff];
        break;
      case "right":
        return [diff, 0];
        break;
      case "center":
      default:
        return [diff / 2, diff / 2];
        break;
    }
  }

  function wrapString(value) {
    return typeof value == "string" ? new Terminal(value) : value;
  }

  function stackAtIllegalPosition(items) {
    /* The height of the last line of the Stack is determined by the last child and
         therefore any element outside the Stack could overlap with other elements.
         If the Stack is the last element no overlap can occur. */
    for (var i = 0; i < items.length; i++) {
      if (items[i] instanceof Stack && i !== items.length - 1) {
        return true;
      }
    }
    return false;
  }

  function SVG(name, attrs, text) {
    attrs = attrs || {};
    text = text || "";
    var el = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (var attr in attrs) {
      if (attr === "xlink:href")
        el.setAttributeNS("http://www.w3.org/1999/xlink", "href", attrs[attr]);
      else el.setAttribute(attr, attrs[attr]);
    }
    el.textContent = text;
    return el;
  }

  function FakeSVG(tagName, attrs, text) {
    if (!(this instanceof FakeSVG)) return new FakeSVG(tagName, attrs, text);
    if (text) this.children = text;
    else this.children = [];
    this.tagName = tagName;
    this.attrs = unnull(attrs, {});
    return this;
  }
  FakeSVG.prototype.format = function (x, y, width) {
    // Virtual
  };
  FakeSVG.prototype.addTo = function (parent) {
    if (parent instanceof FakeSVG) {
      parent.children.push(this);
      return this;
    } else {
      var svg = this.toSVG();
      parent.appendChild(svg);
      return svg;
    }
  };
  FakeSVG.prototype.escapeString = function (string) {
    // Escape markdown and HTML special characters
    return string.replace(/[*_\`\[\]<&]/g, function (charString) {
      return "&#" + charString.charCodeAt(0) + ";";
    });
  };
  FakeSVG.prototype.toSVG = function () {
    var el = SVG(this.tagName, this.attrs);
    if (typeof this.children == "string") {
      el.textContent = this.children;
    } else {
      this.children.forEach(function (e) {
        el.appendChild(e.toSVG());
      });
    }
    return el;
  };
  FakeSVG.prototype.toString = function () {
    var str = "<" + this.tagName;
    var group = this.tagName == "g" || this.tagName == "svg";
    for (var attr in this.attrs) {
      str +=
        " " +
        attr +
        '="' +
        (this.attrs[attr] + "").replace(/&/g, "&amp;").replace(/"/g, "&quot;") +
        '"';
    }
    str += ">";
    if (group) str += "\n";
    if (typeof this.children == "string") {
      str += FakeSVG.prototype.escapeString(this.children);
    } else {
      this.children.forEach(function (e) {
        str += e;
      });
    }
    str += "</" + this.tagName + ">\n";
    return str;
  };

  function Path(x, y) {
    if (!(this instanceof Path)) return new Path(x, y);
    FakeSVG.call(this, "path");
    this.attrs.d = "M" + x + " " + y;
  }
  subclassOf(Path, FakeSVG);
  Path.prototype.m = function (x, y) {
    this.attrs.d += "m" + x + " " + y;
    return this;
  };
  Path.prototype.h = function (val) {
    this.attrs.d += "h" + val;
    return this;
  };
  Path.prototype.right = Path.prototype.h;
  Path.prototype.left = function (val) {
    return this.h(-val);
  };
  Path.prototype.v = function (val) {
    this.attrs.d += "v" + val;
    return this;
  };
  Path.prototype.down = Path.prototype.v;
  Path.prototype.up = function (val) {
    return this.v(-val);
  };
  Path.prototype.arc = function (sweep) {
    var x = Diagram.ARC_RADIUS;
    var y = Diagram.ARC_RADIUS;
    if (sweep[0] == "e" || sweep[1] == "w") {
      x *= -1;
    }
    if (sweep[0] == "s" || sweep[1] == "n") {
      y *= -1;
    }
    if (sweep == "ne" || sweep == "es" || sweep == "sw" || sweep == "wn") {
      var cw = 1;
    } else {
      var cw = 0;
    }
    this.attrs.d +=
      "a" +
      Diagram.ARC_RADIUS +
      " " +
      Diagram.ARC_RADIUS +
      " 0 0 " +
      cw +
      " " +
      x +
      " " +
      y;
    return this;
  };
  Path.prototype.format = function () {
    // All paths in this library start/end horizontally.
    // The extra .5 ensures a minor overlap, so there's no seams in bad rasterizers.
    this.attrs.d += "h.5";
    return this;
  };

  function Diagram(items) {
    if (!(this instanceof Diagram))
      return new Diagram([].slice.call(arguments));
    FakeSVG.call(this, "svg", { class: Diagram.DIAGRAM_CLASS });
    if (stackAtIllegalPosition(items)) {
      throw new RangeError(
        "Stack() must only occur at the very last position of Diagram().",
      );
    }
    this.items = items.map(wrapString);
    this.items.unshift(new Start());
    this.items.push(new End());
    this.width =
      this.items.reduce(function (sofar, el) {
        return sofar + el.width + (el.needsSpace ? 20 : 0);
      }, 0) + 1;
    this.height = this.items.reduce(function (sofar, el) {
      return sofar + el.height;
    }, 0);
    this.up = Math.max.apply(
      null,
      this.items.map(function (x) {
        return x.up;
      }),
    );
    this.down = Math.max.apply(
      null,
      this.items.map(function (x) {
        return x.down;
      }),
    );
    this.formatted = false;
  }
  subclassOf(Diagram, FakeSVG);
  for (var option in options) {
    Diagram[option] = options[option];
  }
  Diagram.prototype.format = function (paddingt, paddingr, paddingb, paddingl) {
    paddingt = unnull(paddingt, 20);
    paddingr = unnull(paddingr, paddingt, 20);
    paddingb = unnull(paddingb, paddingt, 20);
    paddingl = unnull(paddingl, paddingr, 20);
    var x = paddingl;
    var y = paddingt;
    y += this.up;
    var g = FakeSVG(
      "g",
      Diagram.STROKE_ODD_PIXEL_LENGTH ? { transform: "translate(.5 .5)" } : {},
    );
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      if (item.needsSpace) {
        Path(x, y).h(10).addTo(g);
        x += 10;
      }
      item.format(x, y, item.width + item.offsetX).addTo(g);
      x += item.width + item.offsetX;
      y += item.height;
      if (item.needsSpace) {
        Path(x, y).h(10).addTo(g);
        x += 10;
      }
    }
    this.attrs.width = this.width + paddingl + paddingr;
    this.attrs.height = this.up + this.height + this.down + paddingt + paddingb;
    this.attrs.viewBox = "0 0 " + this.attrs.width + " " + this.attrs.height;
    g.addTo(this);
    this.formatted = true;
    return this;
  };
  Diagram.prototype.addTo = function (parent) {
    var scriptTag = document.getElementsByTagName("script");
    scriptTag = scriptTag[scriptTag.length - 1];
    var parentTag = scriptTag.parentNode;
    parent = parent || parentTag;
    return this.$super.addTo.call(this, parent);
  };
  Diagram.prototype.toSVG = function () {
    if (!this.formatted) {
      this.format();
    }
    return this.$super.toSVG.call(this);
  };
  Diagram.prototype.toString = function () {
    if (!this.formatted) {
      this.format();
    }
    return this.$super.toString.call(this);
  };

  function ComplexDiagram() {
    var diagram = new Diagram([].slice.call(arguments));
    var items = diagram.items;
    items.shift();
    items.pop();
    items.unshift(new Start(false));
    items.push(new End(false));
    diagram.items = items;
    return diagram;
  }

  function Sequence(items) {
    if (!(this instanceof Sequence))
      return new Sequence([].slice.call(arguments));
    FakeSVG.call(this, "g");
    if (stackAtIllegalPosition(items)) {
      throw new RangeError(
        "Stack() must only occur at the very last position of Sequence().",
      );
    }
    this.items = items.map(wrapString);
    this.width = this.items.reduce(function (sofar, el) {
      return sofar + el.width + (el.needsSpace ? 20 : 0);
    }, 0);
    this.offsetX = 0;
    this.height = this.items.reduce(function (sofar, el) {
      return sofar + el.height;
    }, 0);
    this.up = this.items.reduce(function (sofar, el) {
      return Math.max(sofar, el.up);
    }, 0);
    this.down = this.items.reduce(function (sofar, el) {
      return Math.max(sofar, el.down);
    }, 0);
  }
  subclassOf(Sequence, FakeSVG);
  Sequence.prototype.format = function (x, y, width) {
    // Hook up the two sides if this is narrower than its stated width.
    var gaps = determineGaps(width, this.width);
    Path(x, y).h(gaps[0]).addTo(this);
    Path(x + gaps[0] + this.width, y + this.height)
      .h(gaps[1])
      .addTo(this);
    x += gaps[0];

    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      if (item.needsSpace) {
        Path(x, y).h(10).addTo(this);
        x += 10;
      }
      item.format(x, y, item.width).addTo(this);
      x += item.width;
      y += item.height;
      if (item.needsSpace) {
        Path(x, y).h(10).addTo(this);
        x += 10;
      }
    }
    return this;
  };

  function Stack(items) {
    if (!(this instanceof Stack)) return new Stack([].slice.call(arguments));
    FakeSVG.call(this, "g");
    if (stackAtIllegalPosition(items)) {
      throw new RangeError(
        "Stack() must only occur at the very last position of Stack().",
      );
    }
    if (items.length === 0) {
      throw new RangeError("Stack() must have at least one child.");
    }
    this.items = items.map(wrapString);
    this.width = this.items.reduce(function (sofar, el) {
      return Math.max(sofar, el.width + (el.needsSpace ? 20 : 0));
    }, 0);
    if (this.items.length > 1) {
      this.width += Diagram.ARC_RADIUS * 2;
    }

    this.up = this.items[0].up;
    this.down = this.items[this.items.length - 1].down;

    this.height = 0;
    for (var i = 0; i < this.items.length; i++) {
      this.height += this.items[i].height;
      if (i !== this.items.length - 1) {
        this.height +=
          Math.max(this.items[i].down, Diagram.VERTICAL_SEPARATION) +
          Math.max(this.items[i + 1].up, Diagram.VERTICAL_SEPARATION) +
          Diagram.ARC_RADIUS * 4;
      }
    }

    if (this.items.length === 0) {
      this.offsetX = 0;
    } else {
      // the value is usually negative because the linebreak resets the x value for the next element
      this.offsetX = -(
        this.width -
        this.items[this.items.length - 1].width -
        this.items[this.items.length - 1].offsetX -
        (this.items[this.items.length - 1].needsSpace ? 20 : 0)
      );
      if (this.items.length > 1) {
        this.offsetX += Diagram.ARC_RADIUS * 2;
      }
    }
  }
  subclassOf(Stack, FakeSVG);
  Stack.prototype.format = function (x, y, width) {
    var xIntitial = x;

    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      if (item.needsSpace) {
        Path(x, y).h(10).addTo(this);
        x += 10;
      }
      item
        .format(
          x,
          y,
          Math.max(item.width + item.offsetX, Diagram.ARC_RADIUS * 2),
        )
        .addTo(this);
      x += Math.max(item.width + item.offsetX, Diagram.ARC_RADIUS * 2);
      y += item.height;
      if (item.needsSpace) {
        Path(x, y).h(10).addTo(this);
        x += 10;
      }

      if (i !== this.items.length - 1) {
        Path(x, y)
          .arc("ne")
          .down(Math.max(item.down, Diagram.VERTICAL_SEPARATION))
          .arc("es")
          .left(x - xIntitial - Diagram.ARC_RADIUS * 2)
          .arc("nw")
          .down(Math.max(this.items[i + 1].up, Diagram.VERTICAL_SEPARATION))
          .arc("ws")
          .addTo(this);

        y +=
          Math.max(item.down, Diagram.VERTICAL_SEPARATION) +
          Math.max(this.items[i + 1].up, Diagram.VERTICAL_SEPARATION) +
          Diagram.ARC_RADIUS * 4;
        x = xIntitial + Diagram.ARC_RADIUS * 2;
      }
    }

    Path(x, y)
      .h(width - (this.width + this.offsetX))
      .addTo(this);

    return this;
  };

  function Choice(normal, items) {
    if (!(this instanceof Choice))
      return new Choice(normal, [].slice.call(arguments, 1));
    FakeSVG.call(this, "g");
    if (typeof normal !== "number" || normal !== Math.floor(normal)) {
      throw new TypeError("The first argument of Choice() must be an integer.");
    } else if (normal < 0 || normal >= items.length) {
      throw new RangeError(
        "The first argument of Choice() must be an index for one of the items.",
      );
    } else {
      this.normal = normal;
    }
    this.items = items.map(wrapString);
    this.width =
      this.items.reduce(function (sofar, el) {
        return Math.max(sofar, el.width);
      }, 0) +
      Diagram.ARC_RADIUS * 4;
    this.offsetX = 0;
    this.height = this.items[normal].height;
    this.up = this.down = 0;
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      if (i < normal) {
        this.up += Math.max(
          Diagram.ARC_RADIUS,
          item.up + item.height + item.down + Diagram.VERTICAL_SEPARATION,
        );
      }
      if (i == normal) {
        this.up += Math.max(Diagram.ARC_RADIUS, item.up);
        this.down += Math.max(Diagram.ARC_RADIUS, item.down);
      }
      if (i > normal) {
        this.down += Math.max(
          Diagram.ARC_RADIUS,
          Diagram.VERTICAL_SEPARATION + item.up + item.down + item.height,
        );
      }
    }
  }
  subclassOf(Choice, FakeSVG);
  Choice.prototype.format = function (x, y, width) {
    // Hook up the two sides if this is narrower than its stated width.
    var gaps = determineGaps(width, this.width);
    Path(x, y).h(gaps[0]).addTo(this);
    Path(x + gaps[0] + this.width, y + this.height)
      .h(gaps[1])
      .addTo(this);
    x += gaps[0];

    var last = this.items.length - 1;
    var innerWidth = this.width - Diagram.ARC_RADIUS * 4;

    // Do the elements that curve above
    for (var i = this.normal - 1; i >= 0; i--) {
      var item = this.items[i];
      if (i == this.normal - 1) {
        var distanceFromY = Math.max(
          Diagram.ARC_RADIUS * 2,
          this.items[i + 1].up +
            Diagram.VERTICAL_SEPARATION +
            item.height +
            item.down,
        );
      }
      Path(x, y)
        .arc("se")
        .up(distanceFromY - Diagram.ARC_RADIUS * 2)
        .arc("wn")
        .addTo(this);
      item
        .format(x + Diagram.ARC_RADIUS * 2, y - distanceFromY, innerWidth)
        .addTo(this);
      Path(
        x + Diagram.ARC_RADIUS * 2 + innerWidth,
        y - distanceFromY + item.height,
      )
        .arc("ne")
        .down(
          distanceFromY -
            item.height +
            this.items[this.normal].height -
            Diagram.ARC_RADIUS * 2,
        )
        .arc("ws")
        .addTo(this);
      distanceFromY += Math.max(
        Diagram.ARC_RADIUS,
        item.up +
          Diagram.VERTICAL_SEPARATION +
          (i == 0 ? 0 : this.items[i - 1].down + this.items[i - 1].height),
      );
    }

    // Do the straight-line path.
    Path(x, y)
      .right(Diagram.ARC_RADIUS * 2)
      .addTo(this);
    this.items[this.normal]
      .format(x + Diagram.ARC_RADIUS * 2, y, innerWidth)
      .addTo(this);
    Path(x + Diagram.ARC_RADIUS * 2 + innerWidth, y + this.height)
      .right(Diagram.ARC_RADIUS * 2)
      .addTo(this);

    // Do the elements that curve below
    for (var i = this.normal + 1; i <= last; i++) {
      var item = this.items[i];
      if (i == this.normal + 1) {
        var distanceFromY = Math.max(
          Diagram.ARC_RADIUS * 2,
          this.items[i - 1].height +
            this.items[i - 1].down +
            Diagram.VERTICAL_SEPARATION +
            item.up,
        );
      }
      Path(x, y)
        .arc("ne")
        .down(distanceFromY - Diagram.ARC_RADIUS * 2)
        .arc("ws")
        .addTo(this);
      item
        .format(x + Diagram.ARC_RADIUS * 2, y + distanceFromY, innerWidth)
        .addTo(this);
      Path(
        x + Diagram.ARC_RADIUS * 2 + innerWidth,
        y + distanceFromY + item.height,
      )
        .arc("se")
        .up(
          distanceFromY -
            Diagram.ARC_RADIUS * 2 +
            item.height -
            this.items[this.normal].height,
        )
        .arc("wn")
        .addTo(this);
      distanceFromY += Math.max(
        Diagram.ARC_RADIUS,
        item.height +
          item.down +
          Diagram.VERTICAL_SEPARATION +
          (i == last ? 0 : this.items[i + 1].up),
      );
    }

    return this;
  };

  function Optional(item, skip) {
    if (skip === undefined) return Choice(1, Skip(), item);
    else if (skip === "skip") return Choice(0, Skip(), item);
    else throw "Unknown value for Optional()'s 'skip' argument.";
  }

  function OneOrMore(item, rep) {
    if (!(this instanceof OneOrMore)) return new OneOrMore(item, rep);
    FakeSVG.call(this, "g");
    rep = rep || new Skip();
    this.item = wrapString(item);
    this.rep = wrapString(rep);
    this.width =
      Math.max(this.item.width, this.rep.width) + Diagram.ARC_RADIUS * 2;
    this.offsetX = 0;
    this.height = this.item.height;
    this.up = this.item.up;
    this.down = Math.max(
      Diagram.ARC_RADIUS * 2,
      this.item.down +
        Diagram.VERTICAL_SEPARATION +
        this.rep.up +
        this.rep.height +
        this.rep.down,
    );
  }
  subclassOf(OneOrMore, FakeSVG);
  OneOrMore.prototype.needsSpace = true;
  OneOrMore.prototype.format = function (x, y, width) {
    // Hook up the two sides if this is narrower than its stated width.
    var gaps = determineGaps(width, this.width);
    Path(x, y).h(gaps[0]).addTo(this);
    Path(x + gaps[0] + this.width, y + this.height)
      .h(gaps[1])
      .addTo(this);
    x += gaps[0];

    // Draw item
    Path(x, y).right(Diagram.ARC_RADIUS).addTo(this);
    this.item
      .format(x + Diagram.ARC_RADIUS, y, this.width - Diagram.ARC_RADIUS * 2)
      .addTo(this);
    Path(x + this.width - Diagram.ARC_RADIUS, y + this.height)
      .right(Diagram.ARC_RADIUS)
      .addTo(this);

    // Draw repeat arc
    var distanceFromY = Math.max(
      Diagram.ARC_RADIUS * 2,
      this.item.height +
        this.item.down +
        Diagram.VERTICAL_SEPARATION +
        this.rep.up,
    );
    Path(x + Diagram.ARC_RADIUS, y)
      .arc("nw")
      .down(distanceFromY - Diagram.ARC_RADIUS * 2)
      .arc("ws")
      .addTo(this);
    this.rep
      .format(
        x + Diagram.ARC_RADIUS,
        y + distanceFromY,
        this.width - Diagram.ARC_RADIUS * 2,
      )
      .addTo(this);
    Path(
      x + this.width - Diagram.ARC_RADIUS,
      y + distanceFromY + this.rep.height,
    )
      .arc("se")
      .up(
        distanceFromY -
          Diagram.ARC_RADIUS * 2 +
          this.rep.height -
          this.item.height,
      )
      .arc("en")
      .addTo(this);

    return this;
  };

  function ZeroOrMore(item, rep, skip) {
    return Optional(OneOrMore(item, rep), skip);
  }

  function Start(simpleType) {
    if (!(this instanceof Start)) return new Start();
    FakeSVG.call(this, "path");
    this.width = 20;
    this.height = 0;
    this.offsetX = 0;
    this.up = 10;
    this.down = 10;
    this.simpleType = simpleType;
  }
  subclassOf(Start, FakeSVG);
  Start.prototype.format = function (x, y) {
    if (this.simpleType === false) {
      this.attrs.d = "M " + x + " " + (y - 10) + " v 20 m 0 -10 h 20.5";
    } else {
      this.attrs.d =
        "M " + x + " " + (y - 10) + " v 20 m 10 -20 v 20 m -10 -10 h 20.5";
    }
    return this;
  };

  function End(simpleType) {
    if (!(this instanceof End)) return new End();
    FakeSVG.call(this, "path");
    this.width = 20;
    this.height = 0;
    this.offsetX = 0;
    this.up = 10;
    this.down = 10;
    this.simpleType = simpleType;
  }
  subclassOf(End, FakeSVG);
  End.prototype.format = function (x, y) {
    if (this.simpleType === false) {
      this.attrs.d = "M " + x + " " + y + " h 20 m 0 -10 v 20";
    } else {
      this.attrs.d = "M " + x + " " + y + " h 20 m -10 -10 v 20 m 10 -20 v 20";
    }
    return this;
  };

  function Terminal(
    text,
    href,
    title,
    occurrenceIdx,
    topRuleName,
    dslRuleName,
    tokenName,
  ) {
    if (!(this instanceof Terminal))
      return new Terminal(
        text,
        href,
        title,
        occurrenceIdx,
        topRuleName,
        dslRuleName,
        tokenName,
      );
    FakeSVG.call(this, "g", { class: "terminal" });
    this.text = text;
    this.label = text;
    this.href = href;
    this.title = title;
    this.occurrenceIdx = occurrenceIdx;
    this.topRuleName = topRuleName;
    this.dslRuleName = dslRuleName;
    this.tokenName = tokenName;
    this.width =
      text.length * 8 +
      20; /* Assume that each char is .5em, and that the em is 16px */
    this.height = 0;
    this.offsetX = 0;
    this.up = 11;
    this.down = 11;
  }
  subclassOf(Terminal, FakeSVG);
  Terminal.prototype.needsSpace = true;
  Terminal.prototype.format = function (x, y, width) {
    // Hook up the two sides if this is narrower than its stated width.
    var gaps = determineGaps(width, this.width);
    Path(x, y).h(gaps[0]).addTo(this);
    Path(x + gaps[0] + this.width, y)
      .h(gaps[1])
      .addTo(this);
    x += gaps[0];

    FakeSVG("rect", {
      x: x,
      y: y - 11,
      width: this.width,
      height: this.up + this.down,
      rx: 10,
      ry: 10,
    }).addTo(this);

    var text = FakeSVG(
      "text",
      {
        x: x + this.width / 2,
        y: y + 4,
        occurrenceIdx: this.occurrenceIdx,
        topRuleName: this.topRuleName,
        dslRuleName: this.dslRuleName,
        tokenName: this.tokenName,
        label: this.label,
      },
      this.text,
    );
    var title = FakeSVG("title", {}, this.title);
    if (this.href)
      FakeSVG("a", { "xlink:href": this.href }, [text]).addTo(this);
    else {
      text.addTo(this);
      if (this.title !== undefined) {
        title.addTo(this);
      }
    }
    return this;
  };

  function NonTerminal(text, href, occurrenceIdx, topRuleName) {
    if (!(this instanceof NonTerminal))
      return new NonTerminal(text, href, occurrenceIdx, topRuleName);
    FakeSVG.call(this, "g", { class: "non-terminal" });
    this.text = text;
    this.ruleName = text;
    this.href = href;
    this.occurrenceIdx = occurrenceIdx;
    this.topRuleName = topRuleName;
    this.width = text.length * 8 + 20;
    this.height = 0;
    this.offsetX = 0;
    this.up = 11;
    this.down = 11;
  }
  subclassOf(NonTerminal, FakeSVG);
  NonTerminal.prototype.needsSpace = true;
  NonTerminal.prototype.format = function (x, y, width) {
    // Hook up the two sides if this is narrower than its stated width.
    var gaps = determineGaps(width, this.width);
    Path(x, y).h(gaps[0]).addTo(this);
    Path(x + gaps[0] + this.width, y)
      .h(gaps[1])
      .addTo(this);
    x += gaps[0];

    FakeSVG("rect", {
      x: x,
      y: y - 11,
      width: this.width,
      height: this.up + this.down,
    }).addTo(this);
    var text = FakeSVG(
      "text",
      {
        x: x + this.width / 2,
        y: y + 4,
        occurrenceIdx: this.occurrenceIdx,
        topRuleName: this.topRuleName,
        ruleName: this.ruleName,
      },
      this.text,
    );
    if (this.href)
      FakeSVG("a", { "xlink:href": this.href }, [text]).addTo(this);
    else text.addTo(this);
    return this;
  };

  function Comment(text) {
    if (!(this instanceof Comment)) return new Comment(text);
    FakeSVG.call(this, "g");
    this.text = text;
    this.width = text.length * 7 + 10;
    this.height = 0;
    this.offsetX = 0;
    this.up = 11;
    this.down = 11;
  }
  subclassOf(Comment, FakeSVG);
  Comment.prototype.needsSpace = true;
  Comment.prototype.format = function (x, y, width) {
    // Hook up the two sides if this is narrower than its stated width.
    var gaps = determineGaps(width, this.width);
    Path(x, y).h(gaps[0]).addTo(this);
    Path(x + gaps[0] + this.width, y + this.height)
      .h(gaps[1])
      .addTo(this);
    x += gaps[0];

    FakeSVG(
      "text",
      {
        x: x + this.width / 2,
        y: y + 5,
        class: "comment",
      },
      this.text,
    ).addTo(this);
    return this;
  };

  function Skip() {
    if (!(this instanceof Skip)) return new Skip();
    FakeSVG.call(this, "g");
    this.width = 0;
    this.height = 0;
    this.offsetX = 0;
    this.up = 0;
    this.down = 0;
  }
  subclassOf(Skip, FakeSVG);
  Skip.prototype.format = function (x, y, width) {
    Path(x, y).right(width).addTo(this);
    return this;
  };

  var root;
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    root = {};
    define([], function () {
      return root;
    });
  } else if (typeof exports === "object") {
    // CommonJS for node
    root = exports;
  } else {
    // Browser globals (root is window.railroad)
    this.railroad = {};
    root = this.railroad;
  }

  var temp = [
    Diagram,
    ComplexDiagram,
    Sequence,
    Stack,
    Choice,
    Optional,
    OneOrMore,
    ZeroOrMore,
    Terminal,
    NonTerminal,
    Comment,
    Skip,
  ];
  /*
     These are the names that the internal classes are exported as.
     If you would like different names, adjust them here.
     */
  [
    "Diagram",
    "ComplexDiagram",
    "Sequence",
    "Stack",
    "Choice",
    "Optional",
    "OneOrMore",
    "ZeroOrMore",
    "Terminal",
    "NonTerminal",
    "Comment",
    "Skip",
  ].forEach(function (e, i) {
    root[e] = temp[i];
  });
}).call(this, {
  VERTICAL_SEPARATION: 8,
  ARC_RADIUS: 10,
  DIAGRAM_CLASS: "railroad-diagram",
  STROKE_ODD_PIXEL_LENGTH: true,
  INTERNAL_ALIGNMENT: "center",
});
