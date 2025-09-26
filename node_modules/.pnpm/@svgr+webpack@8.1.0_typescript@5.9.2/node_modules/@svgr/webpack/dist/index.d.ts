import { Config } from '@svgr/core';
import * as webpack from 'webpack';

interface LoaderOptions extends Config {
    babel?: boolean;
}
declare function svgrLoader(this: webpack.LoaderContext<LoaderOptions>, contents: string): void;

export { svgrLoader as default };
