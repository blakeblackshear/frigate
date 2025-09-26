# Installation
> `npm install --save @types/hoist-non-react-statics`

# Summary
This package contains type definitions for hoist-non-react-statics (https://github.com/mridgway/hoist-non-react-statics#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/hoist-non-react-statics.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/hoist-non-react-statics/index.d.ts)
````ts
import * as React from "react";

interface REACT_STATICS {
    childContextTypes: true;
    contextType: true;
    contextTypes: true;
    defaultProps: true;
    displayName: true;
    getDefaultProps: true;
    getDerivedStateFromError: true;
    getDerivedStateFromProps: true;
    mixins: true;
    propTypes: true;
    type: true;
}

interface KNOWN_STATICS {
    name: true;
    length: true;
    prototype: true;
    caller: true;
    callee: true;
    arguments: true;
    arity: true;
}

interface MEMO_STATICS {
    "$$typeof": true;
    compare: true;
    defaultProps: true;
    displayName: true;
    propTypes: true;
    type: true;
}

interface FORWARD_REF_STATICS {
    "$$typeof": true;
    render: true;
    defaultProps: true;
    displayName: true;
    propTypes: true;
}

declare namespace hoistNonReactStatics {
    type NonReactStatics<
        Source,
        C extends {
            [key: string]: true;
        } = {},
    > = {
        [
            key in Exclude<
                keyof Source,
                Source extends React.MemoExoticComponent<any> ? keyof MEMO_STATICS | keyof C
                    : Source extends React.ForwardRefExoticComponent<any> ? keyof FORWARD_REF_STATICS | keyof C
                    : keyof REACT_STATICS | keyof KNOWN_STATICS | keyof C
            >
        ]: Source[key];
    };
}

declare function hoistNonReactStatics<
    Target,
    Source,
    CustomStatic extends {
        [key: string]: true;
    } = {},
>(
    TargetComponent: Target,
    SourceComponent: Source,
    customStatic?: CustomStatic,
): Target & hoistNonReactStatics.NonReactStatics<Source, CustomStatic>;

export = hoistNonReactStatics;

````

### Additional Details
 * Last updated: Mon, 21 Jul 2025 13:15:00 GMT
 * Dependencies: [hoist-non-react-statics](https://npmjs.com/package/hoist-non-react-statics)
 * Peer dependencies: [@types/react](https://npmjs.com/package/@types/react)

# Credits
These definitions were written by [JounQin](https://github.com/JounQin), and [James Reggio](https://github.com/jamesreggio).
