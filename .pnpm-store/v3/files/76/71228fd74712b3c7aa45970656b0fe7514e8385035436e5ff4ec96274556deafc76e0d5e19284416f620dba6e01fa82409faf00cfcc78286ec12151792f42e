/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import Loadable from 'react-loadable';
declare global {
    interface NodeRequire {
        resolveWeak: (name: string) => number;
    }
}
export default function ComponentCreator(path: string, hash: string): ReturnType<typeof Loadable>;
