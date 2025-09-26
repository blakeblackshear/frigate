/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { type ReactNode } from 'react';
import type { Location } from 'history';
type Props = {
    readonly location: Location;
    readonly children: ReactNode;
};
type State = {
    nextRouteHasLoaded: boolean;
};
declare class PendingNavigation extends React.Component<Props, State> {
    private previousLocation;
    private routeUpdateCleanupCb;
    constructor(props: Props);
    shouldComponentUpdate(nextProps: Props, nextState: State): boolean;
    render(): ReactNode;
}
export default PendingNavigation;
