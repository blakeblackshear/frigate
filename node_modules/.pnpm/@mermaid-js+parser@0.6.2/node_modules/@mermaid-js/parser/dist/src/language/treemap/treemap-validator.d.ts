import type { ValidationAcceptor } from 'langium';
import type { Treemap } from '../generated/ast.js';
import type { TreemapServices } from './module.js';
/**
 * Register custom validation checks.
 */
export declare function registerValidationChecks(services: TreemapServices): void;
/**
 * Implementation of custom validations.
 */
export declare class TreemapValidator {
    /**
     * Validates that a treemap has only one root node.
     * A root node is defined as a node that has no indentation.
     */
    checkSingleRoot(doc: Treemap, accept: ValidationAcceptor): void;
}
