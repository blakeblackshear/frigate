/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import ThemeError from '@theme/Error';
// eslint-disable-next-line react/function-component-definition
const DefaultFallback = (params) => (<ThemeError {...params}/>);
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    componentDidCatch(error) {
        // Catch errors in any components below and re-render with error message
        if (ExecutionEnvironment.canUseDOM) {
            this.setState({ error });
        }
    }
    render() {
        const { children } = this.props;
        const { error } = this.state;
        if (error) {
            const fallbackParams = {
                error,
                tryAgain: () => this.setState({ error: null }),
            };
            const fallback = this.props.fallback ?? DefaultFallback;
            return fallback(fallbackParams);
        }
        // See https://github.com/facebook/docusaurus/issues/6337#issuecomment-1012913647
        return children ?? null;
    }
}
