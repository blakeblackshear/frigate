export = svgjs;
export as namespace svgjs;

declare var svgjs: svgjs.Library;

// todo add SVG.FX
declare namespace svgjs {
    export interface Library {
        (id: string): Doc;
        (domElement: HTMLElement): Doc;
        ns: string;
        xmlns: string;
        xlink: string;
        svgjs: string;
        supported: boolean;

        did: number;
        eid(name: string): string;

        create(name: string): any;
        extend(parent: Object, obj: Object): void;
        invent(config: Object): any;
        adopt(node: HTMLElement): Element;
        prepare(element: HTMLElement): void;
    }
    interface LinkedHTMLElement extends HTMLElement {
        instance: Element;
    }

    // arrange.js
    interface Element {
        front(): this;
        back(): this;
        forward(): this;
        backward(): this;

        siblings(): Element[];
        position(): number;
        next(): Element;
        previous(): Element;
        before(element: Element): Element;
        after(element: Element): Element;
    }

    // array.js
    type ArrayAlias = _Array | number[] | string;

    interface _Array {
        new (array?: ArrayAlias, fallback?: number[]): _Array;
        value: number[];
        morph(array: number[]): this;
        settle(): number[];
        at(pos: NumberAlias): _Array;
        toString(): string;
        valueOf(): number[];
        parse(array: ArrayAlias): number[];
        split(string: string): number[];
        reverse(): this;
        clone(): _Array;
    }
    interface Library { Array: _Array }

    // attr.js
    interface Element {
        attr(): object;
        attr(name: string): any;
        attr(obj: Object): this;
        attr(name: string, value: any, namespace?: string): this;
    }

    // bare.js
    export interface Bare extends Element {
        new (element: string, inherit?: any): Bare;
        words(text: string): this;
    }
    interface Parent {
        element(element: string, inherit?: Object): Bare;
    }
    interface Library { Bare: Bare; }

    // boxes.js
    interface Box {
        height: number;
        width: number;
        y: number;
        x: number;
        cx: number;
        cy: number;
        w: number;
        h: number;
        x2: number;
        y2: number;
        merge(box: Box): Box;
        transform(m: Matrix): Box
    }

    export interface BBox extends Box {
        new (element?: Element): BBox;
    }
    export interface RBox extends Box {
        new (element?: Element): RBox;
    }
    export interface TBox extends Box {
        new (element?: Element): TBox;
    }
    interface Element {
        bbox(): BBox;
        rbox(element?: Element): RBox;
        tbox(): TBox;
    }
    interface Library {
        BBox: BBox;
        RBox: RBox;
        TBox: TBox;
    }

    // clip.js
    export interface ClipPath extends Container {
        new (): ClipPath;
        targets: Element[];
        remove(): this;
    }
    interface Container {
        clip(): ClipPath;
    }
    interface Element {
        clipWith(element: Element): this;
        clipper: ClipPath;
        unclip(): this;
    }
    interface Library { ClipPath: ClipPath; }

    // color.js
    interface ColorLike {
        r: number;
        g: number;
        b: number;
    }

    type ColorAlias = string | ColorLike;

    export interface Color extends ColorLike{
        new (): Color;
        new (color: ColorAlias): Color;

        toString(): string;
        toHex(): string;
        toRgb(): string;
        brightness(): number;
        morph(color: ColorAlias): Color;
        at(pos: number): Color;
    }
    interface Library { Color: Color; }

    // container.js
    interface ViewBoxLike {
        x: number;
        y: number;
        width: number;
        height:number;
    }

    export interface Container extends Parent {
        new (): Container;
    }
    interface Library { Container: Container }

    // data.js
    interface Element {
        data(name: string): any;
        data(name: string, value: any, sustain?: boolean): this;
    }

    // default.js
    interface Library {
        defaults: {
            attrs: {
                'fill-opacity': number;
                'stroke-opacity': number;
                'stroke-width': number;
                'stroke-linejoin': string;
                'stroke-linecap': string;
                'fill': string;
                'stroke': string;
                'opacity': number;
                'x': number;
                'y': number;
                'cx': number;
                'cy': number;
                'width': number;
                'height': number;
                'r': number;
                'rx': number;
                'ry': number;
                'offset': number;
                'stop-opacity': number;
                'stop-color': string;
                'font-size': number;
                'font-family': string;
                'text-anchor': string;
            }
        }
    }

    // defs.js
    export interface Defs extends Container {
        new (): Defs;
    }
    interface Library { Defs: Defs }

    // doc.js
    export interface Doc extends Container {
        new (): Doc;
        new (id: string): Doc;
        new (domElement: HTMLElement): Doc;
        namespace(): this;
        defs(): Defs;
        parent(): HTMLElement;
        spof(): this;
        remove(): this;
    }
    interface Library { Doc: Doc; }

    type ParentTypeAlias = string | Doc | Nested | G;
    // element.js
    export interface Element {
        new (): Element;
        node: LinkedHTMLElement;
        type: string;

        x(x: NumberAlias): this;
        x(): number;
        y(y: NumberAlias): this;
        y(): number;
        //cx(x: number, anchor?: boolean): this;
        cx(x: number): this;
        cx(): number;
        //cy(y: number, anchor?: boolean): this;
        cy(y: number): this;
        cy(): number;
        move(x: NumberAlias, y: NumberAlias): this;
        center(x: number, y: number): this;

        width(width: NumberAlias): this;
        width(): number;
        height(height: NumberAlias): this;
        height(): number;
        size(width?: NumberAlias, height?: NumberAlias): this;

        clone(): Element;
        remove(): this;
        replace(element: Element): Element;

        addTo(parent: Parent): this;
        putIn(parent: Parent): Parent;

        id(): string;
        id(id: string): this;

        inside(x: number, y: number): boolean;

        show(): this;
        hide(): this;
        visible(): boolean;

        toString(): string;

        classes(): string[];
        hasClass(name: string): boolean;
        addClass(name: string): this;
        removeClass(name: string): this;
        toggleClass(name: string): this;

        reference(type: string): Element;
        // Add HTMLElement for Doc inheritance
        parent(type?: ParentTypeAlias): Parent | HTMLElement;
        doc(): Parent;
        parents(): Parent[];

        matches(selector: string): boolean;
        native(): LinkedHTMLElement;

        svg(svg: string): this;
        svg(): string;

        writeDataToDom(): this;
        setData(data: object): this;

        is(cls: any): boolean;
    }
    interface Library { Element: Element; }

    // ellipse.js
    interface CircleMethods extends Shape {
        rx(rx: number): this;
        rx(): this;
        ry(ry: number): this;
        ry(): this;

        radius(x: number, y?: number): this;
    }
    export interface Circle extends CircleMethods {
        new (): Circle;
    }
    export interface Ellipse extends CircleMethods {
        new (): Ellipse;
    }
    interface Container {
        circle(size?: number): Circle;
        ellipse(width?: number, height?: number): Ellipse;
    }
    interface Library {
        Circle: Circle;
        Ellipse: Ellipse;
    }

    // event.js
    interface Element {
        on(event: string, cb: Function, context?: Object): this;
        off(event: string, cb?: Function, context?: Object): this;
        fire(event: string, data?: any): this;
        fire(event: Event): this;
        event(): Event | CustomEvent;

        click(cb: Function): this;
        dblclick(cb: Function): this;
        mousedown(cb: Function): this;
        mouseup(cb: Function): this;
        mouseover(cb: Function): this;
        mouseout(cb: Function): this;
        mousemove(cb: Function): this;
        touchstart(cb: Function): this;
        touchmove(cb: Function): this;
        touchleave(cb: Function): this;
        touchend(cb: Function): this;
        touchcancel(cb: Function): this;
    }

    //fx.js
    interface Library {
        easing: {
            '-'(pos: number): number;
            '<>'(pos: number): number;
            '>'(pos: number): number;
            '<'(pos: number): number;
        }
    }
    interface Element {
        animate(duration?: number, ease?: string, delay?: number): Animation;
        animate(info: { ease?: string; duration?: number; delay?: number }): Animation;
        stop(jumpToEnd:boolean,clearQueue:boolean): Animation;
    }
    // TODO finishs FX
    interface StopProperties {
        color?: ColorAlias;
        offset?: number;
        opacity?: number;
    }

    // gradient.js
    export interface Stop extends Element {
        new (): Stop;
        update(offset?: number, color?: ColorAlias, opacity?: number): this;
        update(opts: StopProperties): this;
    }
    export interface Gradient extends Container {
        new (type: string): Gradient;
        at(offset?: number, color?: ColorAlias, opacity?: number): Stop;
        at(opts: StopProperties): Stop;
        update(block?: Function): this;
        fill(): string;
        fill(...params: any[]): never;
        toString(): string;
        from(x: number, y: number): this;
        to(x: number, y: number): this;
        radius(x: number, y?: number): this;
    }
    interface Container {
        gradient(type: string, block?: (stop: Gradient) => void): Gradient;
    }
    interface Library {
        Gradient: Gradient;
        Stop: Stop;
    }

    // group.js
    export interface G extends Container {
        new (): G;
        gbox(): BBox;
    }
    interface Container { group(): G; }
    interface Library { G: G; }

    // hyperlink.js
    export interface A extends Container {
        new (): A;
        to(url: string): this;
        to(): string;
        show(target: string): this;
        show(): string;
        show(...params: any[]): never;
        target(target: string): this;
        target(): string;
    }
    interface Container {
        link(url: string): A;
    }
    interface Element {
        linkTo(url: string): A;
        linkTo(url: (link: A) => void): A;
    }
    interface Library { A: A; }

    // image.js
    export interface Image extends Shape {
        new (): Image;
        load(url?: string): this;
        loaded(cb: (info: { width: number, height: number, ratio: number, url: string }) => void): this;
        error(cb: (event: Event) => void): this;
    }
    interface Container {
        image(): Image;
        image(href: string, size?: number): Image;
        image(href: string, width?: number, height?: number): Image;
    }
    interface Library { Image: Image; }

    // line.js
    interface ArrayPoint extends Array<number> { }
    type PointArrayAlias = ArrayPoint[] | number[] | PointArray | string;

    export interface Line extends Shape {
        new (): Line;
        array(): PointArray;
        plot(points: PointArrayAlias): this;
        plot(x1: number, y1: number, x2: number, y2: number): this;
        move(x: number, y: number): this;
        size(width?: number, height?: number): this;
    }
    interface Container {
        line(points: PointArrayAlias): Line;
        line(x1: number, y1: number, x2: number, y2: number): Line;
    }
    interface Library { Line: Line; }

    // marker.js
    export interface Marker extends Container {
        new (): Marker;
        ref(x: string | number, y: string | number): this;
        update(block: (marker: Marker) => void): this;
        toString(): string;
    }
    interface Container {
        marker(width?: number, height?: number, block?: (marker: Marker) => void): Marker
    }
    interface Defs {
        marker(width?: number, height?: number, block?: (marker: Marker) => void): Marker
    }
    interface Line {
        marker(position: string, width?: number, height?: number, block?: (marker: Marker) => void): Marker;
        marker(position: string, marker: Marker): Marker;
    }
    interface Polyline {
        marker(position: string, width?: number, height?: number, block?: (marker: Marker) => void): Marker;
        marker(position: string, marker: Marker): Marker;
    }
    interface Polygon {
        marker(position: string, width?: number, height?: number, block?: (marker: Marker) => void): Marker;
        marker(position: string, marker: Marker): Marker;
    }
    interface Path {
        marker(position: string, width?: number, height?: number, block?: (marker: Marker) => void): Marker;
        marker(position: string, marker: Marker): Marker;
    }
    interface Library {
        Marker: Marker;
    }

    // mask.js
    export interface Mask extends Container {
        new (): Mask;
        targets: Element[];
    }
    interface Container { mask(): Mask; }
    interface Element {
        maskWith(mask: Mask): this;
        maskWith(element: Element): this;
        masker: Mask;
        unmask(): this;
    }
    interface Library { Mask: Mask; }

    // matrix.js
    interface MatrixExtract {
        x: number;
        y: number;
        transformedX: number;
        transformedY: number;
        skewX: number;
        skewY: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
        a: number;
        b: number;
        c: number;
        d: number;
        e: number;
        f: number;
        matrix: Matrix;
    }

    interface MatrixLike {
        a: number;
        b: number;
        c: number;
        d: number;
        e: number;
        f: number;
    }

    type MatrixAlias = MatrixLike | number[] | Element | string;

    export interface Matrix {
        new (): Matrix;
        new (source: MatrixAlias): Matrix;
        new (a: number, b: number, c: number, d: number, e: number, f: number): Matrix;
        a: number;
        b: number;
        c: number;
        d: number;
        e: number;
        f: number;
        extract(): MatrixExtract;
        clone(): Matrix;
        morph(matrix: Matrix): this;
        at(pos: number): Matrix;
        multiply(matrix: Matrix): Matrix;
        inverse(): Matrix;
        translate(x: number, y: number): Matrix;
        scale(x: number, y?: number, cx?: number, cy?: number): Matrix;
        rotate(r: number, cx?: number, cy?: number): Matrix;
        flip(a: string, offset?: number): Matrix;
        flip(offset?: number): Matrix;
        skew(x: number, y?: number, cx?: number, cy?: number): Matrix;
        skewX(x: number, cx?: number, cy?: number): Matrix;
        skewY(y: number, cx?: number, cy?: number): Matrix;
        around(cx: number, cy: number, matrix: Matrix): Matrix;
        native(): SVGMatrix;
        toString(): string;
    }
    interface Element {
        ctm(): Matrix;
        screenCTM(): Matrix;
    }
    interface Library { Matrix: Matrix }

    // memory.js
    interface Element {
        remember(name: string, value: any): this;
        remember(name: string): any;
        remember(obj: Object): this;
        forget(...keys: string[]): this;
        forget(): this;
        memory(): Object;
    }

    // nested.js
    export interface Nested extends Container {
        new (): Nested;
    }
    interface Container { nested(): Nested; }
    interface Library { Nested: Nested; }

    // number.js
    interface _Number {
        new (): _Number;
        new (value: _Number): _Number;
        new (value: string): _Number;
        new (value: number, unit?: any): _Number;
        toString(): string;
        toJSON(): Object;
        valueOf(): number;
        plus(number: number): _Number;
        minus(number: number): _Number;
        times(number: number): _Number;
        divide(number: number): _Number;
        to(unit: string): _Number;
        morph(number: any): this;
        at(pos: number): _Number;
    }
    interface Library { Number: _Number; }

    type NumberAlias = _Number | number | string;

    // parent.js
    export interface Parent extends Element {
        new (): Parent;
        children(): Element[];
        add(element: Element, i?: number): this;
        put(element: Element, i?: number): Element;
        has(element: Element): boolean;
        index(element: Element): number;
        get(i: number): Element;
        first(): Element;
        last(): Element;
        each(block: (index: number, children: Element[]) => void, deep?: boolean): this;
        removeElement(element: Element): this;
        clear(): this;
        defs(): Defs;
    }
    interface Library{ Parent: Parent }

    // path.js
    interface PathArrayPoint extends Array<number | string> { }
    type PathArrayAlias = PathArray | (string | number)[] | PathArrayPoint[] | string;

    export interface Path extends Shape {
        new (): Path;
        morphArray: PathArray;
        array(): PathArray;
        plot(d: PathArrayAlias): this;
    }
    interface Container {
        path(): Path;
        path(d: PathArrayAlias): Path;
    }
    interface Library{ Path: Path }

    // pathArray.js
    export interface PathArray extends _Array {
        new (): PathArray;
        new (d: PathArrayAlias): PathArray;
        move(x: number, y: number): this;
        size(width?: number, height?: number): this;
        parse(array: PathArrayAlias): PathArrayPoint[];
        parse(array: ArrayAlias): never;
        bbox(): BBox;
    }
    interface Library { PathArray: PathArray; }

    // pattern.js
    export interface Pattern extends Container {
        new (): Pattern;
        fill(): string;
        fill(...rest: any[]): never;
        update(block: (pattern: Pattern) => void): this;
        toString(): string;
    }
    interface Container {
        pattern(width?: number, height?: number, block?: (pattern: Pattern) => void): Pattern
    }
    interface Library { Pattern: Pattern }

    // point.js
    export interface Point {
        new (): Point;
        new (position: ArrayPoint): Point;
        new (point: Point): Point;
        new (position: { x: number, y: number }): Point;
        new (x: number, y: number): Point;
        
        x: number;
        y: number;

        clone(): Point;
        morph(point: Point): this;
        at(pos: number): Point;
        native(): SVGPoint;
        transform(matrix: Matrix): Point;
    }
    interface Library { Point: Point; }
    interface Element {
        point(): Point;
        point(position: ArrayPoint): Point;
        point(position: { x: number, y: number }): Point;
        point(x: number, y: number): Point;
    }

    // pointArray.js
    export interface PointArray extends _Array {
        new (): PointArray;
        new (points: PointArrayAlias): PointArray;
        toString(): string;
        toLine(): {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        };
        parse(points: PointArrayAlias): ArrayPoint[];
        parse(array: ArrayAlias): never;
        move(x: number, y: number): this;
        size(width?: number, height?: number): this;
        bbox(): BBox;
    }
    interface Library { PointArray: PointArray }

    // poly.js
    interface poly extends Shape {
        array(): PointArray;
        plot(p: PointArrayAlias): this;
        move(x: number, y: number): this;
        size(width: number, height: number): this;
    }
    export interface PolyLine extends poly {
        new (): PolyLine;
    }
    interface Library { PolyLine: PolyLine; }
    interface Container {
        polyline(points: PointArrayAlias): PolyLine;
    }
    export interface Polygon extends poly {
        new (): Polygon;
    }
    interface Library { Polygon: Polygon; }
    interface Container {
        polygon(points: PointArrayAlias): Polygon;
    }

    // rect.js
    export interface Rect extends Shape {
        new (): Rect;
        radius(x: number, y?: number): this;
    }
    interface Library { Rect: Rect; }
    interface Container {
        rect(width?: number, height?: number): Rect;
    }

    // regex.js
    interface Library {
        regex: {
            numberAndUnit: RegExp;
            hex: RegExp;
            rgb: RegExp;
            reference: RegExp;
            transforms: RegExp;
            whitespace: RegExp;
            isHex: RegExp;
            isRgb: RegExp;
            isCss: RegExp;
            isBlank: RegExp;
            isNumber: RegExp;
            isPercent: RegExp;
            isImage: RegExp;
            delimiter: RegExp;
            hyphen: RegExp;
            pathLetters: RegExp;
            isPathLetter: RegExp;
            dots: RegExp;
        }
    }

    // selector.js
    interface Library {
        get(id: string): Element;
        select(query: string, parent?: HTMLElement): Set;
    }
    interface Parent {
        select(query: string): Set;
    }

    // set.js
    export interface Set {
        new (members?: Element[]): Set;
        add(...elments: Element[]): this;
        remove(element: Element): this;
        each(block: (index: number, members: Element[]) => void): this;
        clear(): this;
        length(): number;
        has(element: Element): this;
        index(element: Element): number;
        get(i: number): Element;
        first(): Element;
        last(): Element;
        valueOf(): Element[];
        bbox(): BBox;
        click(cb: Function): Set;
    }
    interface Container { set(members?: Element[]): Set; }
    interface Library { Set: Set; }

    // shape.js
    export interface Shape extends Element {
        new (): Shape;
    }
    interface Library { Shape: Shape; }

    // style.js
    interface Element {
        style(styles: Object): this;
        style(style: string): any;
        style(style: string, value: any): this;
    }

    // sugar.js
    interface StrokeData {
        color?: string;
        width?: number;
        opacity?: number;
        linecap?: string;
        linejoin?: string;
        miterlimit?: number;
        dasharray?: string;
        dashoffset?: number;
    }
    interface Element {
        fill(fill: { color?: string; opacity?: number, rule?: string }): this;
        fill(color: string): this;
        fill(pattern: Element): this;
        fill(image: Image): this;
        stroke(stroke: StrokeData): this;
        stroke(color: string): this;
        rotate(d: number, cx?: number, cy?: number): this;
        skew(x: number, y?: number, cx?: number, cy?: number): this;
        scale(x: number, y?: number, cx?: number, cy?: number): this;
        translate(x: number, y: number): this;
        flip(a: string, offset?: number): this;
        flip(offset?: number): this;
        matrix(m: MatrixAlias): this;
        matrix(a: number, b: number, c: number, d: number, e: number, f: number): this;
        opacity(o: number): this;
        opacity(): number;
        dx(x: NumberAlias): this;
        dy(y: NumberAlias): this;
        dmove(x: NumberAlias, y: NumberAlias): this;
    }
    interface Path {
        length(): number;
        pointAt(length: number): { x: number, y: number };
    }
    interface FontData {
        family?: string;
        size?: NumberAlias;
        anchor?: string;
        leading?: NumberAlias;
        weight?: string;
        style?: string
    }
    interface Parent {
        font(font: FontData): this;
    }
    interface Text {
        font(font: FontData): this;
    }

    // text.js
    export interface Text extends Shape {
        new (): Text;
        clone(): Text;
        text(): string;
        text(text: string): this;
        text(block: (text: Text) => void): this;
        size(fontSize: NumberAlias): this;
        leading(): number;
        leading(leading: NumberAlias): this;
        lines(): Set;
        rebuild(enabled: boolean): this;
        build(enabled: boolean): this;
        plain(text: string): this;
        tspan(text: string): Tspan;
        tspan(block: (tspan: Tspan) => void): this;
        clear(): this;
        length(): number;
    }
    interface Container {
        text(text: string): Text;
        text(block: (tspan: Tspan) => void): Text;
        plain(text: string): Text;
    }
    interface Library { Text: Text; }
    export interface Tspan extends Shape {
        new (): Tspan;
        text(): string;
        text(text: string): Tspan;
        text(block: (tspan: Tspan) => void): this;
        dx(x: NumberAlias): this;
        dy(y: NumberAlias): this;
        newLine(): this;
        plain(text: any): this;
        tspan(text: string): Tspan;
        tspan(block: (tspan: Tspan) => void): this;
        clear(): this;
        length(): number;
    }
    interface Library { Tspan: Tspan; }

    // textpath.js
    export interface TextPath extends Parent {
        new (): TextPath;
    }
    interface Text {
        path(d: PathArrayAlias): this;
        track(): Element;
        textPath(): Element;
    }
    interface Library { TextPath: TextPath; }

    // transform.js
    interface Element {
        transform(t: Transform, relative?: boolean): Element;
        transform(): Transform;
        untransform(): this;
        matrixify(): Matrix;
        toParent(parent: Parent): this;
        toDoc(): this;
    }
    interface Transform {
        x?: number;
        y?: number;
        rotation?: number;
        cx?: number;
        cy?: number;
        scaleX?: number;
        scaleY?: number;
        skewX?: number;
        skewY?: number;
        matrix?: Matrix; // 1,0,0,1,0,0
        a?: number; // direct digits of matrix
        b?: number;
        c?: number;
        d?: number;
        e?: number;
        f?: number;
        scale?: number;
    }
    export interface Transformation {
        new (...transform: Transform[]): Transformation;
        new (source: Transform, inversed?: boolean): Transformation;
        at(pos: number): Matrix;
        undo(transform: Transform): this
    }
    export interface Translate extends Transformation {new (): Translate}
    export interface Rotate extends Transformation {new (): Rotate}
    export interface Scale extends Transformation {new (): Scale}
    export interface Skew extends Transformation {new (): Skew}
    interface Library {
        Transformation: Transformation;
        Translate: Translate;
        Rotate: Rotate;
        Scale: Scale;
        Skew: Skew;
    }

    // ungroup.js
    interface Parent {
        ungroup(parent: Parent, depth?: number): this;
        flatten(parent: Parent, depth?: number): this;
    }

    // use.js
    export interface Use extends Shape {
        new (): Use;
        element(element: Element, file?: string): this;
    }
    interface Container {
        use(element: Element | string, file?: string): Use;
    }
    interface Library { Use: Use; }

    // utilities.js
    interface Library {
        utils: {
            map(array: any[], block: Function): any;
            filter(array: any[], block: Function): any;
            radians(d: number): number;
            degrees(r: number): number;
            filterSVGElements: HTMLElement[]
        }
    }

    // viewbox.js
    type ViewBoxAlias = ViewBoxLike | number[] | string | Element;

    interface ViewBox {
        new (source: ViewBoxAlias): ViewBox;
        new (x: number, y: number, width: number, height: number): ViewBox;
        x: number;
        y: number;
        width: number;
        height: number;
        zoom?: number;
        toString(): string;
        morph(source: ViewBoxAlias): ViewBox;
        morph(x: number, y: number, width: number, height: number): ViewBox;
        at(pos:number): ViewBox;
    }
    interface Container {
        viewbox(): ViewBox;
        viewbox(x: number, y: number, width: number, height: number): this;
        viewbox(viewbox: ViewBoxLike): this;
    }
    interface Library { ViewBox: ViewBox; }

    export interface Animation {
        stop(): Animation;
        finish(): Animation;
        pause(): Animation;
        play(): Animation;
        reverse(reversed?: boolean): Animation;

        attr(name: string, value: any, namespace?: string): Animation;
        attr(obj: Object): Animation;
        attr(name: string): any;
        attr(): object;

        viewbox(x: number, y: number, w: number, h: number): Animation;

        move(x: number, y: number, anchor?: boolean): Animation;
        dmove(x: number, y: number): Animation;
        x(x: number, anchor?: boolean): Animation;
        y(y: number, anchor?: boolean): Animation;

        center(x: number, y: number, anchor?: boolean): Animation;
        cx(x: number, anchor?: boolean): Animation;
        cy(y: number, anchor?: boolean): Animation;

        size(w: number, h: number, anchor?: boolean): Animation;
        during(cb: (pos: number) => void): Animation;
        to(value: number): Animation;
        after(cb: () => void): Animation;
        
        delay(delayMS: number): Animation;

        rotate(degrees: number, cx?: number, cy?: number): Animation;
        skew(skewX: number, skewY?: number,  cx?: number, cy?: number): Animation;
        scale(scaleX: number, scaleY?: number, cx?: number, cy?: number): Animation;
        translate(x: number, y: number): Animation;
        transform(t: Transform, relative?: boolean): Animation;

        // TODO style, etc, bbox...
    }
}