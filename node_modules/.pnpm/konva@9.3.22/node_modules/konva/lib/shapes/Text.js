"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Text = void 0;
exports.stringToArray = stringToArray;
const Util_1 = require("../Util");
const Factory_1 = require("../Factory");
const Shape_1 = require("../Shape");
const Global_1 = require("../Global");
const Validators_1 = require("../Validators");
const Global_2 = require("../Global");
function stringToArray(string) {
    return [...string].reduce((acc, char, index, array) => {
        if (/\p{Emoji}/u.test(char)) {
            const nextChar = array[index + 1];
            if (nextChar && /\p{Emoji_Modifier}|\u200D/u.test(nextChar)) {
                acc.push(char + nextChar);
                array[index + 1] = '';
            }
            else {
                acc.push(char);
            }
        }
        else if (/\p{Regional_Indicator}{2}/u.test(char + (array[index + 1] || ''))) {
            acc.push(char + array[index + 1]);
        }
        else if (index > 0 && /\p{Mn}|\p{Me}|\p{Mc}/u.test(char)) {
            acc[acc.length - 1] += char;
        }
        else if (char) {
            acc.push(char);
        }
        return acc;
    }, []);
}
const AUTO = 'auto', CENTER = 'center', INHERIT = 'inherit', JUSTIFY = 'justify', CHANGE_KONVA = 'Change.konva', CONTEXT_2D = '2d', DASH = '-', LEFT = 'left', TEXT = 'text', TEXT_UPPER = 'Text', TOP = 'top', BOTTOM = 'bottom', MIDDLE = 'middle', NORMAL = 'normal', PX_SPACE = 'px ', SPACE = ' ', RIGHT = 'right', RTL = 'rtl', WORD = 'word', CHAR = 'char', NONE = 'none', ELLIPSIS = '…', ATTR_CHANGE_LIST = [
    'direction',
    'fontFamily',
    'fontSize',
    'fontStyle',
    'fontVariant',
    'padding',
    'align',
    'verticalAlign',
    'lineHeight',
    'text',
    'width',
    'height',
    'wrap',
    'ellipsis',
    'letterSpacing',
], attrChangeListLen = ATTR_CHANGE_LIST.length;
function normalizeFontFamily(fontFamily) {
    return fontFamily
        .split(',')
        .map((family) => {
        family = family.trim();
        const hasSpace = family.indexOf(' ') >= 0;
        const hasQuotes = family.indexOf('"') >= 0 || family.indexOf("'") >= 0;
        if (hasSpace && !hasQuotes) {
            family = `"${family}"`;
        }
        return family;
    })
        .join(', ');
}
let dummyContext;
function getDummyContext() {
    if (dummyContext) {
        return dummyContext;
    }
    dummyContext = Util_1.Util.createCanvasElement().getContext(CONTEXT_2D);
    return dummyContext;
}
function _fillFunc(context) {
    context.fillText(this._partialText, this._partialTextX, this._partialTextY);
}
function _strokeFunc(context) {
    context.setAttr('miterLimit', 2);
    context.strokeText(this._partialText, this._partialTextX, this._partialTextY);
}
function checkDefaultFill(config) {
    config = config || {};
    if (!config.fillLinearGradientColorStops &&
        !config.fillRadialGradientColorStops &&
        !config.fillPatternImage) {
        config.fill = config.fill || 'black';
    }
    return config;
}
class Text extends Shape_1.Shape {
    constructor(config) {
        super(checkDefaultFill(config));
        this._partialTextX = 0;
        this._partialTextY = 0;
        for (let n = 0; n < attrChangeListLen; n++) {
            this.on(ATTR_CHANGE_LIST[n] + CHANGE_KONVA, this._setTextData);
        }
        this._setTextData();
    }
    _sceneFunc(context) {
        const textArr = this.textArr, textArrLen = textArr.length;
        if (!this.text()) {
            return;
        }
        let padding = this.padding(), fontSize = this.fontSize(), lineHeightPx = this.lineHeight() * fontSize, verticalAlign = this.verticalAlign(), direction = this.direction(), alignY = 0, align = this.align(), totalWidth = this.getWidth(), letterSpacing = this.letterSpacing(), fill = this.fill(), textDecoration = this.textDecoration(), shouldUnderline = textDecoration.indexOf('underline') !== -1, shouldLineThrough = textDecoration.indexOf('line-through') !== -1, n;
        direction = direction === INHERIT ? context.direction : direction;
        let translateY = lineHeightPx / 2;
        let baseline = MIDDLE;
        if (Global_1.Konva._fixTextRendering) {
            const metrics = this.measureSize('M');
            baseline = 'alphabetic';
            translateY =
                (metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 +
                    lineHeightPx / 2;
        }
        if (direction === RTL) {
            context.setAttr('direction', direction);
        }
        context.setAttr('font', this._getContextFont());
        context.setAttr('textBaseline', baseline);
        context.setAttr('textAlign', LEFT);
        if (verticalAlign === MIDDLE) {
            alignY = (this.getHeight() - textArrLen * lineHeightPx - padding * 2) / 2;
        }
        else if (verticalAlign === BOTTOM) {
            alignY = this.getHeight() - textArrLen * lineHeightPx - padding * 2;
        }
        context.translate(padding, alignY + padding);
        for (n = 0; n < textArrLen; n++) {
            let lineTranslateX = 0;
            let lineTranslateY = 0;
            const obj = textArr[n], text = obj.text, width = obj.width, lastLine = obj.lastInParagraph;
            context.save();
            if (align === RIGHT) {
                lineTranslateX += totalWidth - width - padding * 2;
            }
            else if (align === CENTER) {
                lineTranslateX += (totalWidth - width - padding * 2) / 2;
            }
            if (shouldUnderline) {
                context.save();
                context.beginPath();
                const yOffset = Global_1.Konva._fixTextRendering
                    ? Math.round(fontSize / 4)
                    : Math.round(fontSize / 2);
                const x = lineTranslateX;
                const y = translateY + lineTranslateY + yOffset;
                context.moveTo(x, y);
                const lineWidth = align === JUSTIFY && !lastLine ? totalWidth - padding * 2 : width;
                context.lineTo(x + Math.round(lineWidth), y);
                context.lineWidth = fontSize / 15;
                const gradient = this._getLinearGradient();
                context.strokeStyle = gradient || fill;
                context.stroke();
                context.restore();
            }
            if (shouldLineThrough) {
                context.save();
                context.beginPath();
                const yOffset = Global_1.Konva._fixTextRendering ? -Math.round(fontSize / 4) : 0;
                context.moveTo(lineTranslateX, translateY + lineTranslateY + yOffset);
                const lineWidth = align === JUSTIFY && !lastLine ? totalWidth - padding * 2 : width;
                context.lineTo(lineTranslateX + Math.round(lineWidth), translateY + lineTranslateY + yOffset);
                context.lineWidth = fontSize / 15;
                const gradient = this._getLinearGradient();
                context.strokeStyle = gradient || fill;
                context.stroke();
                context.restore();
            }
            if (direction !== RTL && (letterSpacing !== 0 || align === JUSTIFY)) {
                const spacesNumber = text.split(' ').length - 1;
                const array = stringToArray(text);
                for (let li = 0; li < array.length; li++) {
                    const letter = array[li];
                    if (letter === ' ' && !lastLine && align === JUSTIFY) {
                        lineTranslateX += (totalWidth - padding * 2 - width) / spacesNumber;
                    }
                    this._partialTextX = lineTranslateX;
                    this._partialTextY = translateY + lineTranslateY;
                    this._partialText = letter;
                    context.fillStrokeShape(this);
                    lineTranslateX += this.measureSize(letter).width + letterSpacing;
                }
            }
            else {
                if (letterSpacing !== 0) {
                    context.setAttr('letterSpacing', `${letterSpacing}px`);
                }
                this._partialTextX = lineTranslateX;
                this._partialTextY = translateY + lineTranslateY;
                this._partialText = text;
                context.fillStrokeShape(this);
            }
            context.restore();
            if (textArrLen > 1) {
                translateY += lineHeightPx;
            }
        }
    }
    _hitFunc(context) {
        const width = this.getWidth(), height = this.getHeight();
        context.beginPath();
        context.rect(0, 0, width, height);
        context.closePath();
        context.fillStrokeShape(this);
    }
    setText(text) {
        const str = Util_1.Util._isString(text)
            ? text
            : text === null || text === undefined
                ? ''
                : text + '';
        this._setAttr(TEXT, str);
        return this;
    }
    getWidth() {
        const isAuto = this.attrs.width === AUTO || this.attrs.width === undefined;
        return isAuto ? this.getTextWidth() + this.padding() * 2 : this.attrs.width;
    }
    getHeight() {
        const isAuto = this.attrs.height === AUTO || this.attrs.height === undefined;
        return isAuto
            ? this.fontSize() * this.textArr.length * this.lineHeight() +
                this.padding() * 2
            : this.attrs.height;
    }
    getTextWidth() {
        return this.textWidth;
    }
    getTextHeight() {
        Util_1.Util.warn('text.getTextHeight() method is deprecated. Use text.height() - for full height and text.fontSize() - for one line height.');
        return this.textHeight;
    }
    measureSize(text) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        let _context = getDummyContext(), fontSize = this.fontSize(), metrics;
        _context.save();
        _context.font = this._getContextFont();
        metrics = _context.measureText(text);
        _context.restore();
        const scaleFactor = fontSize / 100;
        return {
            actualBoundingBoxAscent: (_a = metrics.actualBoundingBoxAscent) !== null && _a !== void 0 ? _a : 71.58203125 * scaleFactor,
            actualBoundingBoxDescent: (_b = metrics.actualBoundingBoxDescent) !== null && _b !== void 0 ? _b : 0,
            actualBoundingBoxLeft: (_c = metrics.actualBoundingBoxLeft) !== null && _c !== void 0 ? _c : -7.421875 * scaleFactor,
            actualBoundingBoxRight: (_d = metrics.actualBoundingBoxRight) !== null && _d !== void 0 ? _d : 75.732421875 * scaleFactor,
            alphabeticBaseline: (_e = metrics.alphabeticBaseline) !== null && _e !== void 0 ? _e : 0,
            emHeightAscent: (_f = metrics.emHeightAscent) !== null && _f !== void 0 ? _f : 100 * scaleFactor,
            emHeightDescent: (_g = metrics.emHeightDescent) !== null && _g !== void 0 ? _g : -20 * scaleFactor,
            fontBoundingBoxAscent: (_h = metrics.fontBoundingBoxAscent) !== null && _h !== void 0 ? _h : 91 * scaleFactor,
            fontBoundingBoxDescent: (_j = metrics.fontBoundingBoxDescent) !== null && _j !== void 0 ? _j : 21 * scaleFactor,
            hangingBaseline: (_k = metrics.hangingBaseline) !== null && _k !== void 0 ? _k : 72.80000305175781 * scaleFactor,
            ideographicBaseline: (_l = metrics.ideographicBaseline) !== null && _l !== void 0 ? _l : -21 * scaleFactor,
            width: metrics.width,
            height: fontSize,
        };
    }
    _getContextFont() {
        return (this.fontStyle() +
            SPACE +
            this.fontVariant() +
            SPACE +
            (this.fontSize() + PX_SPACE) +
            normalizeFontFamily(this.fontFamily()));
    }
    _addTextLine(line) {
        const align = this.align();
        if (align === JUSTIFY) {
            line = line.trim();
        }
        const width = this._getTextWidth(line);
        return this.textArr.push({
            text: line,
            width: width,
            lastInParagraph: false,
        });
    }
    _getTextWidth(text) {
        const letterSpacing = this.letterSpacing();
        const length = text.length;
        return getDummyContext().measureText(text).width + letterSpacing * length;
    }
    _setTextData() {
        let lines = this.text().split('\n'), fontSize = +this.fontSize(), textWidth = 0, lineHeightPx = this.lineHeight() * fontSize, width = this.attrs.width, height = this.attrs.height, fixedWidth = width !== AUTO && width !== undefined, fixedHeight = height !== AUTO && height !== undefined, padding = this.padding(), maxWidth = width - padding * 2, maxHeightPx = height - padding * 2, currentHeightPx = 0, wrap = this.wrap(), shouldWrap = wrap !== NONE, wrapAtWord = wrap !== CHAR && shouldWrap, shouldAddEllipsis = this.ellipsis();
        this.textArr = [];
        getDummyContext().font = this._getContextFont();
        const additionalWidth = shouldAddEllipsis
            ? this._getTextWidth(ELLIPSIS)
            : 0;
        for (let i = 0, max = lines.length; i < max; ++i) {
            let line = lines[i];
            let lineWidth = this._getTextWidth(line);
            if (fixedWidth && lineWidth > maxWidth) {
                while (line.length > 0) {
                    let low = 0, high = stringToArray(line).length, match = '', matchWidth = 0;
                    while (low < high) {
                        const mid = (low + high) >>> 1, lineArray = stringToArray(line), substr = lineArray.slice(0, mid + 1).join(''), substrWidth = this._getTextWidth(substr);
                        const shouldConsiderEllipsis = shouldAddEllipsis &&
                            fixedHeight &&
                            currentHeightPx + lineHeightPx > maxHeightPx;
                        const effectiveWidth = shouldConsiderEllipsis
                            ? substrWidth + additionalWidth
                            : substrWidth;
                        if (effectiveWidth <= maxWidth) {
                            low = mid + 1;
                            match = substr;
                            matchWidth = substrWidth;
                        }
                        else {
                            high = mid;
                        }
                    }
                    if (match) {
                        if (wrapAtWord) {
                            const lineArray = stringToArray(line);
                            const matchArray = stringToArray(match);
                            const nextChar = lineArray[matchArray.length];
                            const nextIsSpaceOrDash = nextChar === SPACE || nextChar === DASH;
                            let wrapIndex;
                            if (nextIsSpaceOrDash && matchWidth <= maxWidth) {
                                wrapIndex = matchArray.length;
                            }
                            else {
                                const lastSpaceIndex = matchArray.lastIndexOf(SPACE);
                                const lastDashIndex = matchArray.lastIndexOf(DASH);
                                wrapIndex = Math.max(lastSpaceIndex, lastDashIndex) + 1;
                            }
                            if (wrapIndex > 0) {
                                low = wrapIndex;
                                match = lineArray.slice(0, low).join('');
                                matchWidth = this._getTextWidth(match);
                            }
                        }
                        match = match.trimRight();
                        this._addTextLine(match);
                        textWidth = Math.max(textWidth, matchWidth);
                        currentHeightPx += lineHeightPx;
                        const shouldHandleEllipsis = this._shouldHandleEllipsis(currentHeightPx);
                        if (shouldHandleEllipsis) {
                            this._tryToAddEllipsisToLastLine();
                            break;
                        }
                        const lineArray = stringToArray(line);
                        line = lineArray.slice(low).join('').trimLeft();
                        if (line.length > 0) {
                            lineWidth = this._getTextWidth(line);
                            if (lineWidth <= maxWidth) {
                                this._addTextLine(line);
                                currentHeightPx += lineHeightPx;
                                textWidth = Math.max(textWidth, lineWidth);
                                break;
                            }
                        }
                    }
                    else {
                        break;
                    }
                }
            }
            else {
                this._addTextLine(line);
                currentHeightPx += lineHeightPx;
                textWidth = Math.max(textWidth, lineWidth);
                if (this._shouldHandleEllipsis(currentHeightPx) && i < max - 1) {
                    this._tryToAddEllipsisToLastLine();
                }
            }
            if (this.textArr[this.textArr.length - 1]) {
                this.textArr[this.textArr.length - 1].lastInParagraph = true;
            }
            if (fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx) {
                break;
            }
        }
        this.textHeight = fontSize;
        this.textWidth = textWidth;
    }
    _shouldHandleEllipsis(currentHeightPx) {
        const fontSize = +this.fontSize(), lineHeightPx = this.lineHeight() * fontSize, height = this.attrs.height, fixedHeight = height !== AUTO && height !== undefined, padding = this.padding(), maxHeightPx = height - padding * 2, wrap = this.wrap(), shouldWrap = wrap !== NONE;
        return (!shouldWrap ||
            (fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx));
    }
    _tryToAddEllipsisToLastLine() {
        const width = this.attrs.width, fixedWidth = width !== AUTO && width !== undefined, padding = this.padding(), maxWidth = width - padding * 2, shouldAddEllipsis = this.ellipsis();
        const lastLine = this.textArr[this.textArr.length - 1];
        if (!lastLine || !shouldAddEllipsis) {
            return;
        }
        if (fixedWidth) {
            const haveSpace = this._getTextWidth(lastLine.text + ELLIPSIS) < maxWidth;
            if (!haveSpace) {
                lastLine.text = lastLine.text.slice(0, lastLine.text.length - 3);
            }
        }
        this.textArr.splice(this.textArr.length - 1, 1);
        this._addTextLine(lastLine.text + ELLIPSIS);
    }
    getStrokeScaleEnabled() {
        return true;
    }
    _useBufferCanvas() {
        const hasLine = this.textDecoration().indexOf('underline') !== -1 ||
            this.textDecoration().indexOf('line-through') !== -1;
        const hasShadow = this.hasShadow();
        if (hasLine && hasShadow) {
            return true;
        }
        return super._useBufferCanvas();
    }
}
exports.Text = Text;
Text.prototype._fillFunc = _fillFunc;
Text.prototype._strokeFunc = _strokeFunc;
Text.prototype.className = TEXT_UPPER;
Text.prototype._attrsAffectingSize = [
    'text',
    'fontSize',
    'padding',
    'wrap',
    'lineHeight',
    'letterSpacing',
];
(0, Global_2._registerNode)(Text);
Factory_1.Factory.overWriteSetter(Text, 'width', (0, Validators_1.getNumberOrAutoValidator)());
Factory_1.Factory.overWriteSetter(Text, 'height', (0, Validators_1.getNumberOrAutoValidator)());
Factory_1.Factory.addGetterSetter(Text, 'direction', INHERIT);
Factory_1.Factory.addGetterSetter(Text, 'fontFamily', 'Arial');
Factory_1.Factory.addGetterSetter(Text, 'fontSize', 12, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Text, 'fontStyle', NORMAL);
Factory_1.Factory.addGetterSetter(Text, 'fontVariant', NORMAL);
Factory_1.Factory.addGetterSetter(Text, 'padding', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Text, 'align', LEFT);
Factory_1.Factory.addGetterSetter(Text, 'verticalAlign', TOP);
Factory_1.Factory.addGetterSetter(Text, 'lineHeight', 1, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Text, 'wrap', WORD);
Factory_1.Factory.addGetterSetter(Text, 'ellipsis', false, (0, Validators_1.getBooleanValidator)());
Factory_1.Factory.addGetterSetter(Text, 'letterSpacing', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Text, 'text', '', (0, Validators_1.getStringValidator)());
Factory_1.Factory.addGetterSetter(Text, 'textDecoration', '');
