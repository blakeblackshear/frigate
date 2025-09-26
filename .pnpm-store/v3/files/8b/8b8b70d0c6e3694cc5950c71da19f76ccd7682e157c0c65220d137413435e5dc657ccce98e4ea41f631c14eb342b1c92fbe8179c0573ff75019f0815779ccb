/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../colorPicker.css';
import * as dom from '../../../../../base/browser/dom.js';
import { GlobalPointerMoveMonitor } from '../../../../../base/browser/globalPointerMoveMonitor.js';
import { Color, RGBA } from '../../../../../base/common/color.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
const $ = dom.$;
export class Strip extends Disposable {
    constructor(container, model, type) {
        super();
        this.model = model;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._onColorFlushed = new Emitter();
        this.onColorFlushed = this._onColorFlushed.event;
        if (type === "standalone" /* ColorPickerWidgetType.Standalone */) {
            this.domNode = dom.append(container, $('.standalone-strip'));
            this.overlay = dom.append(this.domNode, $('.standalone-overlay'));
        }
        else {
            this.domNode = dom.append(container, $('.strip'));
            this.overlay = dom.append(this.domNode, $('.overlay'));
        }
        this.slider = dom.append(this.domNode, $('.slider'));
        this.slider.style.top = `0px`;
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.POINTER_DOWN, e => this.onPointerDown(e)));
        this._register(model.onDidChangeColor(this.onDidChangeColor, this));
        this.layout();
    }
    layout() {
        this.height = this.domNode.offsetHeight - this.slider.offsetHeight;
        const value = this.getValue(this.model.color);
        this.updateSliderPosition(value);
    }
    onDidChangeColor(color) {
        const value = this.getValue(color);
        this.updateSliderPosition(value);
    }
    onPointerDown(e) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const monitor = this._register(new GlobalPointerMoveMonitor());
        const origin = dom.getDomNodePagePosition(this.domNode);
        this.domNode.classList.add('grabbing');
        if (e.target !== this.slider) {
            this.onDidChangeTop(e.offsetY);
        }
        monitor.startMonitoring(e.target, e.pointerId, e.buttons, event => this.onDidChangeTop(event.pageY - origin.top), () => null);
        const pointerUpListener = dom.addDisposableListener(e.target.ownerDocument, dom.EventType.POINTER_UP, () => {
            this._onColorFlushed.fire();
            pointerUpListener.dispose();
            monitor.stopMonitoring(true);
            this.domNode.classList.remove('grabbing');
        }, true);
    }
    onDidChangeTop(top) {
        const value = Math.max(0, Math.min(1, 1 - (top / this.height)));
        this.updateSliderPosition(value);
        this._onDidChange.fire(value);
    }
    updateSliderPosition(value) {
        this.slider.style.top = `${(1 - value) * this.height}px`;
    }
}
export class OpacityStrip extends Strip {
    constructor(container, model, type) {
        super(container, model, type);
        this.domNode.classList.add('opacity-strip');
        this.onDidChangeColor(this.model.color);
    }
    onDidChangeColor(color) {
        super.onDidChangeColor(color);
        const { r, g, b } = color.rgba;
        const opaque = new Color(new RGBA(r, g, b, 1));
        const transparent = new Color(new RGBA(r, g, b, 0));
        this.overlay.style.background = `linear-gradient(to bottom, ${opaque} 0%, ${transparent} 100%)`;
    }
    getValue(color) {
        return color.hsva.a;
    }
}
export class HueStrip extends Strip {
    constructor(container, model, type) {
        super(container, model, type);
        this.domNode.classList.add('hue-strip');
    }
    getValue(color) {
        return 1 - (color.hsva.h / 360);
    }
}
//# sourceMappingURL=colorPickerStrip.js.map