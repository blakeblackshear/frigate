/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import Translate from '@docusaurus/Translate';
import { getErrorCausalChain } from '@docusaurus/utils-common';
import styles from './errorBoundaryUtils.module.css';
export function ErrorBoundaryTryAgainButton(props) {
    return (<button type="button" {...props}>
      <Translate id="theme.ErrorPageContent.tryAgain" description="The label of the button to try again rendering when the React error boundary captures an error">
        Try again
      </Translate>
    </button>);
}
// A very simple reusable ErrorBoundary fallback component
export function ErrorBoundaryErrorMessageFallback({ error, tryAgain, }) {
    return (<div className={styles.errorBoundaryFallback}>
      <p>{error.message}</p>
      <ErrorBoundaryTryAgainButton onClick={tryAgain}/>
    </div>);
}
export function ErrorBoundaryError({ error }) {
    const causalChain = getErrorCausalChain(error);
    const fullMessage = causalChain.map((e) => e.message).join('\n\nCause:\n');
    return <p className={styles.errorBoundaryError}>{fullMessage}</p>;
}
/**
 * This component is useful to wrap a low-level error into a more meaningful
 * error with extra context, using the ES error-cause feature.
 *
 * <ErrorCauseBoundary
 *   onError={(error) => new Error("extra context message",{cause: error})}
 * >
 *   <RiskyComponent>
 * </ErrorCauseBoundary>
 */
export class ErrorCauseBoundary extends React.Component {
    componentDidCatch(error, errorInfo) {
        throw this.props.onError(error, errorInfo);
    }
    render() {
        return this.props.children;
    }
}
//# sourceMappingURL=errorBoundaryUtils.js.map