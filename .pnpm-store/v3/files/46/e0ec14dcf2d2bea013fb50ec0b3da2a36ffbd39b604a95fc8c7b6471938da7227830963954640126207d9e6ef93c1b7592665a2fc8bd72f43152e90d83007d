# Installation
> `npm install --save @types/react-router-config`

# Summary
This package contains type definitions for react-router-config (https://github.com/ReactTraining/react-router/tree/master/packages/react-router-config).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-router-config.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-router-config/index.d.ts)
````ts
import { Location } from "history";
import * as React from "react";
import { match, RouteComponentProps, SwitchProps } from "react-router";

export interface RouteConfigComponentProps<Params extends { [K in keyof Params]?: string } = {}>
    extends RouteComponentProps<Params>
{
    route?: RouteConfig | undefined;
}

export interface RouteConfig {
    key?: React.Key | undefined;
    location?: Location | undefined;
    component?: React.ComponentType<RouteConfigComponentProps<any>> | React.ComponentType | undefined;
    path?: string | string[] | undefined;
    exact?: boolean | undefined;
    strict?: boolean | undefined;
    routes?: RouteConfig[] | undefined;
    render?: ((props: RouteConfigComponentProps<any>) => React.ReactNode) | undefined;
    [propName: string]: any;
}

export interface MatchedRoute<
    Params extends { [K in keyof Params]?: string },
    TRouteConfig extends RouteConfig = RouteConfig,
> {
    route: TRouteConfig;
    match: match<Params>;
}

export function matchRoutes<
    Params extends { [K in keyof Params]?: string },
    TRouteConfig extends RouteConfig = RouteConfig,
>(routes: TRouteConfig[], pathname: string): Array<MatchedRoute<Params, TRouteConfig>>;

export function renderRoutes(
    routes: RouteConfig[] | undefined,
    extraProps?: any,
    switchProps?: SwitchProps,
): React.JSX.Element;

````

### Additional Details
 * Last updated: Wed, 06 Dec 2023 06:36:35 GMT
 * Dependencies: [@types/history](https://npmjs.com/package/@types/history), [@types/react](https://npmjs.com/package/@types/react), [@types/react-router](https://npmjs.com/package/@types/react-router)

# Credits
These definitions were written by [John Reilly](https://github.com/johnnyreilly), and [Mathieu TUDISCO](https://github.com/mathieutu).
