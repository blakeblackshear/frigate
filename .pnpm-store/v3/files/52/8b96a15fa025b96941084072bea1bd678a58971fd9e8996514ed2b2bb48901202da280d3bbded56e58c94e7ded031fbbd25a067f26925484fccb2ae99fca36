/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { type ComponentProps, type ReactNode } from 'react';
import type { Props as ErrorProps } from '@theme/Error';
export declare function ErrorBoundaryTryAgainButton(props: ComponentProps<'button'>): ReactNode;
export declare function ErrorBoundaryErrorMessageFallback({ error, tryAgain, }: ErrorProps): ReactNode;
export declare function ErrorBoundaryError({ error }: {
    error: Error;
}): ReactNode;
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
export declare class ErrorCauseBoundary extends React.Component<{
    children: React.ReactNode;
    onError: (error: Error, errorInfo: React.ErrorInfo) => Error;
}, unknown> {
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): never;
    render(): React.ReactNode;
}
//# sourceMappingURL=errorBoundaryUtils.d.ts.map