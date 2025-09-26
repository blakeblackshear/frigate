"use strict";

var react = require("react"), observerSettings = {
  characterData: !0,
  characterDataOldValue: !0,
  childList: !0,
  subtree: !0
}, getCurrentRange = function() {
  return window.getSelection().getRangeAt(0);
}, setCurrentRange = function(c) {
  var a = window.getSelection();
  a.empty();
  a.addRange(c);
}, isUndoRedoKey = function(c) {
  return (c.metaKey || c.ctrlKey) && !c.altKey && "KeyZ" === c.code;
}, toString = function(c) {
  c = [ c.firstChild ];
  for (var b, a = ""; b = c.pop(); ) {
    b.nodeType === Node.TEXT_NODE ? a += b.textContent : b.nodeType === Node.ELEMENT_NODE && "BR" === b.nodeName && (a += "\n"), 
    b.nextSibling && c.push(b.nextSibling), b.firstChild && c.push(b.firstChild);
  }
  "\n" !== a[a.length - 1] && (a += "\n");
  return a;
}, setStart = function(c, a, b) {
  b < a.textContent.length ? c.setStart(a, b) : c.setStartAfter(a);
}, setEnd = function(c, a, b) {
  b < a.textContent.length ? c.setEnd(a, b) : c.setEndAfter(a);
}, getPosition = function(c) {
  var a = getCurrentRange(), b = a.collapsed ? 0 : a.toString().length, d = document.createRange();
  d.setStart(c, 0);
  d.setEnd(a.startContainer, a.startOffset);
  return {
    position: c = (d = d.toString()).length,
    extent: b,
    content: d = (d = d.split("\n"))[a = d.length - 1],
    line: a
  };
}, makeRange = function(c, a, b) {
  0 >= a && (a = 0);
  if (!b || 0 > b) {
    b = a;
  }
  var d = document.createRange();
  c = [ c.firstChild ];
  for (var f, k = 0, g = a; f = c[c.length - 1]; ) {
    if (f.nodeType === Node.TEXT_NODE) {
      if (k + f.textContent.length >= g) {
        var l = g - k;
        if (g === a) {
          if (setStart(d, f, l), b !== a) {
            g = b;
            continue;
          } else {
            break;
          }
        } else {
          setEnd(d, f, l);
          break;
        }
      }
      k += f.textContent.length;
    } else if (f.nodeType === Node.ELEMENT_NODE && "BR" === f.nodeName) {
      if (k + 1 >= g) {
        if (g === a) {
          if (setStart(d, f, 0), b !== a) {
            g = b;
            continue;
          } else {
            break;
          }
        } else {
          setEnd(d, f, 0);
          break;
        }
      }
      k++;
    }
    c.pop();
    f.nextSibling && c.push(f.nextSibling);
    f.firstChild && c.push(f.firstChild);
  }
  return d;
};

exports.useEditable = function(c, a, b) {
  function d(h) {
    var b = c.current;
    if (b) {
      var a = getPosition(b);
      b = toString(b);
      a.position += h.length - b.length;
      e.position = a;
      e.onChange(h, a);
    }
  }
  function k(h, b) {
    var a = c.current;
    if (a) {
      var e = getCurrentRange();
      e.deleteContents();
      e.collapse();
      e = getPosition(a);
      var n = b || 0;
      (e = makeRange(a, b = e.position + (0 > n ? n : 0), e.position + (0 < n ? n : 0))).deleteContents();
      h && e.insertNode(document.createTextNode(h));
      setCurrentRange(makeRange(a, b + h.length));
    }
  }
  function f(b) {
    var e = c.current;
    if (e) {
      e.focus();
      var a = 0;
      if ("number" == typeof b) {
        a = b;
      } else {
        var h = toString(e).split("\n").slice(0, b.row);
        b.row && (a += h.join("\n").length + 1);
        a += b.column;
      }
      setCurrentRange(makeRange(e, a));
    }
  }
  function g() {
    var b = c.current;
    return {
      text: toString(b),
      position: b = getPosition(b)
    };
  }
  function l() {
    e.observer.disconnect();
  }
  b || (b = {});
  var y = react.useState([])[1], e = react.useState((function() {
    var e = {
      observer: null,
      disconnected: !1,
      onChange: a,
      queue: [],
      history: [],
      historyAt: -1,
      position: null
    };
    "undefined" != typeof MutationObserver && (e.observer = new MutationObserver((function b(b) {
      var a;
      (a = e.queue).push.apply(a, b);
    })));
    return e;
  }))[0], m = react.useMemo((function() {
    return {
      update: d,
      insert: k,
      move: f,
      getState: g
    };
  }), []);
  if ("object" != typeof navigator) {
    return m;
  }
  react.useLayoutEffect((function() {
    e.onChange = a;
    if (c.current && !b.disabled) {
      e.disconnected = !1;
      e.observer.observe(c.current, observerSettings);
      if (e.position) {
        var h = e.position, d = h.position;
        setCurrentRange(makeRange(c.current, d, d + h.extent));
      }
      return l;
    }
  }));
  react.useLayoutEffect((function() {
    if (!c.current || b.disabled) {
      e.history.length = 0, e.historyAt = -1;
    } else {
      var a = c.current;
      if (e.position) {
        a.focus();
        var d = e.position, f = d.position;
        setCurrentRange(makeRange(a, f, f + d.extent));
      }
      var g = a.style.whiteSpace, k = a.contentEditable, l = !0;
      try {
        a.contentEditable = "plaintext-only";
      } catch (q) {
        a.contentEditable = "true", l = !1;
      }
      "pre" !== g && (a.style.whiteSpace = "pre-wrap");
      b.indentation && (a.style.tabSize = a.style.MozTabSize = "" + b.indentation);
      d = "" + " ".repeat(b.indentation || 0);
      var t, z = new RegExp("^(?:" + d + ")"), A = new RegExp("^(?:" + d + ")*(" + d + ")$"), p = function(b) {
        if (c.current && e.position) {
          var q = toString(a), d = getPosition(a), f = (new Date).valueOf(), g = e.history[e.historyAt];
          !b && 500 > f - t || g && g[1] === q ? t = f : (b = ++e.historyAt, e.history[b] = [ d, q ], 
          e.history.splice(b + 1), 500 < b && (e.historyAt--, e.history.shift()));
        }
      }, r = function() {
        var b;
        (b = e.queue).push.apply(b, e.observer.takeRecords());
        b = getPosition(a);
        if (e.queue.length) {
          e.observer.disconnect();
          e.disconnected = !0;
          var c = toString(a);
          e.position = b;
          for (var d, f; d = e.queue.pop(); ) {
            null !== d.oldValue && (d.target.textContent = d.oldValue);
            for (f = d.removedNodes.length - 1; 0 <= f; f--) {
              d.target.insertBefore(d.removedNodes[f], d.nextSibling);
            }
            for (f = d.addedNodes.length - 1; 0 <= f; f--) {
              d.addedNodes[f].parentNode && d.target.removeChild(d.addedNodes[f]);
            }
          }
          e.onChange(c, b);
        }
      }, u = function(c) {
        if (!c.defaultPrevented && c.target === a) {
          if (e.disconnected) {
            return c.preventDefault(), y([]);
          }
          if (isUndoRedoKey(c)) {
            c.preventDefault(), c.shiftKey ? (c = ++e.historyAt, (c = e.history[c]) || (e.historyAt = e.history.length - 1)) : (c = --e.historyAt, 
            (c = e.history[c]) || (e.historyAt = 0)), c && (e.observer.disconnect(), e.disconnected = !0, 
            e.position = c[0], e.onChange(c[1], c[0]));
          } else {
            p();
            if ("Enter" === c.key) {
              c.preventDefault();
              var d = getPosition(a), f = /\S/g.exec(d.content);
              d = "\n" + d.content.slice(0, f ? f.index : d.content.length);
              m.insert(d);
            } else if ((!l || b.indentation) && "Backspace" === c.key) {
              c.preventDefault(), getCurrentRange().collapsed ? (d = getPosition(a), d = A.exec(d.content), 
              m.insert("", d ? -d[1].length : -1)) : m.insert("", 0);
            } else if (b.indentation && "Tab" === c.key) {
              c.preventDefault();
              f = (d = getPosition(a)).position - d.content.length;
              var g = toString(a);
              d = c.shiftKey ? g.slice(0, f) + d.content.replace(z, "") + g.slice(f + d.content.length) : g.slice(0, f) + (b.indentation ? " ".repeat(b.indentation) : "\t") + g.slice(f);
              m.update(d);
            }
            c.repeat && r();
          }
        }
      }, v = function(b) {
        b.defaultPrevented || b.isComposing || (isUndoRedoKey(b) || p(), r(), a.focus());
      }, w = function(b) {
        e.position = window.getSelection().rangeCount && b.target === a ? getPosition(a) : null;
      }, x = function(a) {
        a.preventDefault();
        p(!0);
        m.insert(a.clipboardData.getData("text/plain"));
        p(!0);
        r();
      };
      document.addEventListener("selectstart", w);
      window.addEventListener("keydown", u);
      a.addEventListener("paste", x);
      a.addEventListener("keyup", v);
      return function() {
        document.removeEventListener("selectstart", w);
        window.removeEventListener("keydown", u);
        a.removeEventListener("paste", x);
        a.removeEventListener("keyup", v);
        a.style.whiteSpace = g;
        a.contentEditable = k;
      };
    }
  }), [ c.current, b.disabled, b.indentation ]);
  return m;
};
//# sourceMappingURL=use-editable.js.map
