import type { DefaultSharedCoreModuleContext, LangiumCoreServices, LangiumSharedCoreServices, Module, PartialLangiumCoreServices } from 'langium';
import { CommonValueConverter } from '../common/valueConverter.js';
import { GitGraphTokenBuilder } from './tokenBuilder.js';
interface GitGraphAddedServices {
    parser: {
        TokenBuilder: GitGraphTokenBuilder;
        ValueConverter: CommonValueConverter;
    };
}
export type GitGraphServices = LangiumCoreServices & GitGraphAddedServices;
export declare const GitGraphModule: Module<GitGraphServices, PartialLangiumCoreServices & GitGraphAddedServices>;
export declare function createGitGraphServices(context?: DefaultSharedCoreModuleContext): {
    shared: LangiumSharedCoreServices;
    GitGraph: GitGraphServices;
};
export {};
