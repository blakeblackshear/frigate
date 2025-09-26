/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Metadata of a language.
 */
export interface LanguageMetaData {
    languageId: string;
    fileExtensions: readonly string[];
    caseInsensitive: boolean;
    /**
     * Mode used to optimize code for development or production environments.
     *
     * In production mode, all Chevrotain lexer/parser validations are disabled.
     */
    mode: 'development' | 'production';
}
