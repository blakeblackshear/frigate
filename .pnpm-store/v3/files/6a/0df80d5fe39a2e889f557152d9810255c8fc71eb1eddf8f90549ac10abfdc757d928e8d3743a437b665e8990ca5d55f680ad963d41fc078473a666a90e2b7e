/*! svg.easing.js - v2.0.0 - 2016-04-25
* https://github.com/wout/svg.easing.js
* Copyright (c) 2016 Wout Fierens; Licensed MIT */
// Based on Easing Equations (c) 2003 [Robert Penner](http://www.robertpenner.com/), all rights reserved.

(function() {
    var easing = {

        quadIn: function(pos) {
            return Math.pow(pos, 2)
        }

    , quadOut: function(pos) {
        return -(Math.pow((pos - 1), 2) - 1)
    }

    , quadInOut: function(pos) {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 2)
        return -0.5 * ((pos -= 2) * pos - 2)
    }

    , cubicIn: function(pos) {
        return Math.pow(pos, 3)
    }

    , cubicOut: function(pos) {
        return (Math.pow((pos - 1), 3) + 1)
    }

    , cubicInOut: function(pos) {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos,3)
        return 0.5 * (Math.pow((pos - 2), 3) + 2)
    }

    , quartIn: function(pos) {
        return Math.pow(pos, 4)
    }

    , quartOut: function(pos) {
        return -(Math.pow((pos-1), 4) -1)
    }

    , quartInOut: function(pos) {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 4)
        return -0.5 * ((pos -= 2) * Math.pow(pos, 3) - 2)
    }

    , quintIn: function(pos) {
        return Math.pow(pos, 5)
    }

    , quintOut: function(pos) {
        return (Math.pow((pos-1), 5) +1)
    }

    , quintInOut: function(pos) {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 5)
        return 0.5 * (Math.pow((pos - 2), 5) + 2)
    }

    , sineIn: function(pos) {
        return -Math.cos(pos * (Math.PI / 2)) + 1
    }

    , sineOut: function(pos) {
        return Math.sin(pos * (Math.PI / 2))
    }

    , sineInOut: function(pos) {
        return (-.5 * (Math.cos(Math.PI * pos) -1))
    }

    , expoIn: function(pos) {
        return (pos==0) ? 0 : Math.pow(2, 10 * (pos - 1))
    }

    , expoOut: function(pos) {
        return (pos==1) ? 1 : -Math.pow(2, -10 * pos) + 1
    }

    , expoInOut: function(pos) {
        if(pos==0) return 0
        if(pos==1) return 1
        if((pos/=0.5) < 1) return 0.5 * Math.pow(2,10 * (pos-1))
        return 0.5 * (-Math.pow(2, -10 * --pos) + 2)
    }

    , circIn: function(pos) {
        return -(Math.sqrt(1 - (pos*pos)) - 1)
    }

    , circOut: function(pos) {
        return Math.sqrt(1 - Math.pow((pos-1), 2))
    }

    , circInOut: function(pos) {
        if((pos/=0.5) < 1) return -0.5 * (Math.sqrt(1 - pos*pos) - 1)
        return 0.5 * (Math.sqrt(1 - (pos-=2)*pos) + 1)
    }

    , backIn: function (pos) {
        var s = 1.70158
        return pos * pos * ((s + 1) * pos - s)
    }

    , backOut: function (pos) {
        pos = pos - 1
        var s = 1.70158
        return pos * pos * ((s + 1) * pos + s) + 1
    }

    , backInOut: function (pos) {
        var s = 1.70158
        if((pos/=0.5) < 1) return 0.5*(pos*pos*(((s*=(1.525))+1)*pos -s))
        return 0.5*((pos-=2)*pos*(((s*=(1.525))+1)*pos +s) +2)
    }

    , swingFromTo: function(pos) {
        var s = 1.70158
        return ((pos/=0.5) < 1) ? 0.5*(pos*pos*(((s*=(1.525))+1)*pos - s)) :
        0.5*((pos-=2)*pos*(((s*=(1.525))+1)*pos + s) + 2)
    }

    , swingFrom: function(pos) {
        var s = 1.70158
        return pos*pos*((s+1)*pos - s)
    }

    , swingTo: function(pos) {
        var s = 1.70158
        return (pos-=1)*pos*((s+1)*pos + s) + 1
    }

    , bounce: function(pos) {
        var s = 7.5625,
            p = 2.75,
            l

        if (pos < (1 / p)) {
            l = s * pos * pos
        } else {
            if (pos < (2 / p)) {
                pos -= (1.5 / p)
                l = s * pos * pos + .75
            } else {
                if (pos < (2.5 / p)) {
                    pos -= (2.25 / p)
                    l = s * pos * pos + .9375
                } else {
                    pos -= (2.625 / p)
                    l = s * pos * pos + .984375
                }
            }
        }
        return l
    }

    , bounceOut: function(pos){
        if ((pos) < (1/2.75)) {
            return (7.5625*pos*pos)
        } else if (pos < (2/2.75)) {
            return (7.5625*(pos-=(1.5/2.75))*pos + .75)
        } else if (pos < (2.5/2.75)) {
            return (7.5625*(pos-=(2.25/2.75))*pos + .9375)
        } else {
            return (7.5625*(pos-=(2.625/2.75))*pos + .984375)
        }
    }

    , elastic: function(pos) {
        if (pos == !!pos) return pos
        return Math.pow(2, -10 * pos) * Math.sin((pos - 0.075) * (2 * Math.PI) / .3) + 1
    }

    }

    for (key in easing)
        SVG.easing[key] = easing[key]
})()
