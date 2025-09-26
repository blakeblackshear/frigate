/*!
* svg.select.js - An extension of svg.js which allows to select elements with mouse
* @version 2.1.2
* https://github.com/svgdotjs/svg.select.js
*
* @copyright Ulrich-Matthias Schäfer
* @license MIT
*/;
;(function() {
"use strict";

function SelectHandler(el) {

    this.el = el;
    el.remember('_selectHandler', this);
    this.pointSelection = {isSelected: false};
    this.rectSelection = {isSelected: false};

}

SelectHandler.prototype.init = function (value, options) {

    var bbox = this.el.bbox();
    this.options = {};

    // Merging the defaults and the options-object together
    for (var i in this.el.selectize.defaults) {
        this.options[i] = this.el.selectize.defaults[i];
        if (options[i] !== undefined) {
            this.options[i] = options[i];
        }
    }

    this.parent = this.el.parent();
    this.nested = (this.nested || this.parent.group());
    this.nested.matrix(new SVG.Matrix(this.el).translate(bbox.x, bbox.y));

    // When deepSelect is enabled and the element is a line/polyline/polygon, draw only points for moving
    if (this.options.deepSelect && ['line', 'polyline', 'polygon'].indexOf(this.el.type) !== -1) {
        this.selectPoints(value);
    } else {
        this.selectRect(value);
    }

    this.observe();
    this.cleanup();

};

SelectHandler.prototype.selectPoints = function (value) {

    this.pointSelection.isSelected = value;

    // When set is already there we dont have to create one
    if (this.pointSelection.set) {
        return this;
    }

    // Create our set of elements
    this.pointSelection.set = this.parent.set();
    // draw the circles and mark the element as selected
    this.drawCircles();

    return this;

};

// create the point-array which contains the 2 points of a line or simply the points-array of polyline/polygon
SelectHandler.prototype.getPointArray = function () {
    var bbox = this.el.bbox();

    return this.el.array().valueOf().map(function (el) {
        return [el[0] - bbox.x, el[1] - bbox.y];
    });
};

// The function to draw the circles
SelectHandler.prototype.drawCircles = function () {

    var _this = this, array = this.getPointArray();

    // go through the array of points
    for (var i = 0, len = array.length; i < len; ++i) {

        var curriedEvent = (function (k) {
            return function (ev) {
                ev = ev || window.event;
                ev.preventDefault ? ev.preventDefault() : ev.returnValue = false;
                ev.stopPropagation();

                var x = ev.pageX || ev.touches[0].pageX;
                var y = ev.pageY || ev.touches[0].pageY;
                _this.el.fire('point', {x: x, y: y, i: k, event: ev});
            };
        })(i);

        // add every point to the set
        this.pointSelection.set.add(
            // a circle with our css-classes and a touchstart-event which fires our event for moving points
            this.nested.circle(this.options.radius)
                .center(array[i][0], array[i][1])
                .addClass(this.options.classPoints)
                .addClass(this.options.classPoints + '_point')
                .on('touchstart', curriedEvent)
                .on('mousedown', curriedEvent)
        );
    }

};

// every time a circle is moved, we have to update the positions of our circle
SelectHandler.prototype.updatePointSelection = function () {
    var array = this.getPointArray();

    this.pointSelection.set.each(function (i) {
        if (this.cx() === array[i][0] && this.cy() === array[i][1]) {
            return;
        }
        this.center(array[i][0], array[i][1]);
    });
};

SelectHandler.prototype.updateRectSelection = function () {
    var bbox = this.el.bbox();

    this.rectSelection.set.get(0).attr({
        width: bbox.width,
        height: bbox.height
    });

    // set.get(1) is always in the upper left corner. no need to move it
    if (this.options.points) {
        this.rectSelection.set.get(2).center(bbox.width, 0);
        this.rectSelection.set.get(3).center(bbox.width, bbox.height);
        this.rectSelection.set.get(4).center(0, bbox.height);

        this.rectSelection.set.get(5).center(bbox.width / 2, 0);
        this.rectSelection.set.get(6).center(bbox.width, bbox.height / 2);
        this.rectSelection.set.get(7).center(bbox.width / 2, bbox.height);
        this.rectSelection.set.get(8).center(0, bbox.height / 2);
    }

    if (this.options.rotationPoint) {
        if (this.options.points) {
            this.rectSelection.set.get(9).center(bbox.width / 2, 20);
        } else {
            this.rectSelection.set.get(1).center(bbox.width / 2, 20);
        }
    }
};

SelectHandler.prototype.selectRect = function (value) {

    var _this = this, bbox = this.el.bbox();

    this.rectSelection.isSelected = value;

    // when set is already p
    this.rectSelection.set = this.rectSelection.set || this.parent.set();

    // helperFunction to create a mouse-down function which triggers the event specified in `eventName`
    function getMoseDownFunc(eventName) {
        return function (ev) {
            ev = ev || window.event;
            ev.preventDefault ? ev.preventDefault() : ev.returnValue = false;
            ev.stopPropagation();

            var x = ev.pageX || ev.touches[0].pageX;
            var y = ev.pageY || ev.touches[0].pageY;
            _this.el.fire(eventName, {x: x, y: y, event: ev});
        };
    }

    // create the selection-rectangle and add the css-class
    if (!this.rectSelection.set.get(0)) {
        this.rectSelection.set.add(this.nested.rect(bbox.width, bbox.height).addClass(this.options.classRect));
    }

    // Draw Points at the edges, if enabled
    if (this.options.points && !this.rectSelection.set.get(1)) {
        var ename ="touchstart", mname = "mousedown";
        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(0, 0).attr('class', this.options.classPoints + '_lt').on(mname, getMoseDownFunc('lt')).on(ename, getMoseDownFunc('lt')));
        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(bbox.width, 0).attr('class', this.options.classPoints + '_rt').on(mname, getMoseDownFunc('rt')).on(ename, getMoseDownFunc('rt')));
        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(bbox.width, bbox.height).attr('class', this.options.classPoints + '_rb').on(mname, getMoseDownFunc('rb')).on(ename, getMoseDownFunc('rb')));
        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(0, bbox.height).attr('class', this.options.classPoints + '_lb').on(mname, getMoseDownFunc('lb')).on(ename, getMoseDownFunc('lb')));

        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(bbox.width / 2, 0).attr('class', this.options.classPoints + '_t').on(mname, getMoseDownFunc('t')).on(ename, getMoseDownFunc('t')));
        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(bbox.width, bbox.height / 2).attr('class', this.options.classPoints + '_r').on(mname, getMoseDownFunc('r')).on(ename, getMoseDownFunc('r')));
        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(bbox.width / 2, bbox.height).attr('class', this.options.classPoints + '_b').on(mname, getMoseDownFunc('b')).on(ename, getMoseDownFunc('b')));
        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(0, bbox.height / 2).attr('class', this.options.classPoints + '_l').on(mname, getMoseDownFunc('l')).on(ename, getMoseDownFunc('l')));

        this.rectSelection.set.each(function () {
            this.addClass(_this.options.classPoints);
        });
    }

    // draw rotationPint, if enabled
    if (this.options.rotationPoint && ((this.options.points && !this.rectSelection.set.get(9)) || (!this.options.points && !this.rectSelection.set.get(1)))) {

        var curriedEvent = function (ev) {
            ev = ev || window.event;
            ev.preventDefault ? ev.preventDefault() : ev.returnValue = false;
            ev.stopPropagation();

            var x = ev.pageX || ev.touches[0].pageX;
            var y = ev.pageY || ev.touches[0].pageY;
            _this.el.fire('rot', {x: x, y: y, event: ev});
        };
        this.rectSelection.set.add(this.nested.circle(this.options.radius).center(bbox.width / 2, 20).attr('class', this.options.classPoints + '_rot')
            .on("touchstart", curriedEvent).on("mousedown", curriedEvent));

    }

};

SelectHandler.prototype.handler = function () {

    var bbox = this.el.bbox();
    this.nested.matrix(new SVG.Matrix(this.el).translate(bbox.x, bbox.y));

    if (this.rectSelection.isSelected) {
        this.updateRectSelection();
    }

    if (this.pointSelection.isSelected) {
        this.updatePointSelection();
    }

};

SelectHandler.prototype.observe = function () {
    var _this = this;

    if (MutationObserver) {
        if (this.rectSelection.isSelected || this.pointSelection.isSelected) {
            this.observerInst = this.observerInst || new MutationObserver(function () {
                _this.handler();
            });
            this.observerInst.observe(this.el.node, {attributes: true});
        } else {
            try {
                this.observerInst.disconnect();
                delete this.observerInst;
            } catch (e) {
            }
        }
    } else {
        this.el.off('DOMAttrModified.select');

        if (this.rectSelection.isSelected || this.pointSelection.isSelected) {
            this.el.on('DOMAttrModified.select', function () {
                _this.handler();
            });
        }
    }
};

SelectHandler.prototype.cleanup = function () {

    //var _this = this;

    if (!this.rectSelection.isSelected && this.rectSelection.set) {
        // stop watching the element, remove the selection
        this.rectSelection.set.each(function () {
            this.remove();
        });

        this.rectSelection.set.clear();
        delete this.rectSelection.set;
    }

    if (!this.pointSelection.isSelected && this.pointSelection.set) {
        // Remove all points, clear the set, stop watching the element
        this.pointSelection.set.each(function () {
            this.remove();
        });

        this.pointSelection.set.clear();
        delete this.pointSelection.set;
    }

    if (!this.pointSelection.isSelected && !this.rectSelection.isSelected) {
        this.nested.remove();
        delete this.nested;

    }
};


SVG.extend(SVG.Element, {
    // Select element with mouse
    selectize: function (value, options) {

        // Check the parameters and reassign if needed
        if (typeof value === 'object') {
            options = value;
            value = true;
        }

        var selectHandler = this.remember('_selectHandler') || new SelectHandler(this);

        selectHandler.init(value === undefined ? true : value, options || {});

        return this;

    }
});

SVG.Element.prototype.selectize.defaults = {
    points: true,                            // If true, points at the edges are drawn. Needed for resize!
    classRect: 'svg_select_boundingRect',    // Css-class added to the rect
    classPoints: 'svg_select_points',        // Css-class added to the points
    radius: 7,                               // radius of the points
    rotationPoint: true,                     // If true, rotation point is drawn. Needed for rotation!
    deepSelect: false                        // If true, moving of single points is possible (only line, polyline, polyon)
};
}());
