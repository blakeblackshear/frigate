import { ConfigurationItem } from 'vscode-languageserver-protocol';
import type { Feature, _RemoteWorkspace } from './server';
export interface Configuration {
    getConfiguration(): Promise<any>;
    getConfiguration(section: string): Promise<any>;
    getConfiguration(item: ConfigurationItem): Promise<any>;
    getConfiguration(items: ConfigurationItem[]): Promise<any[]>;
}
export declare const ConfigurationFeature: Feature<_RemoteWorkspace, Configuration>;
