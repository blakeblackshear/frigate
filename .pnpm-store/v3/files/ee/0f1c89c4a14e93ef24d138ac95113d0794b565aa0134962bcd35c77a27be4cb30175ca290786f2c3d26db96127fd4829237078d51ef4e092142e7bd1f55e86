/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ReactElement, ReactNode } from 'react';
import type { ClientModule } from '@docusaurus/types';
import type { Location } from 'history';
export declare function dispatchLifecycleAction<K extends keyof ClientModule>(lifecycleAction: K, ...args: Parameters<NonNullable<ClientModule[K]>>): () => void;
declare function ClientLifecyclesDispatcher({ children, location, previousLocation, }: {
    children: ReactElement;
    location: Location;
    previousLocation: Location | null;
}): ReactNode;
export default ClientLifecyclesDispatcher;
