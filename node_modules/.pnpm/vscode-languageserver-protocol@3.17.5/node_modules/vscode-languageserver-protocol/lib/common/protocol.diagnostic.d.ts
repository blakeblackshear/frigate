import { RequestHandler0, RequestHandler, ProgressType } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Diagnostic, DocumentUri, integer } from 'vscode-languageserver-types';
import { MessageDirection, ProtocolRequestType0, ProtocolRequestType } from './messages';
import type { PartialResultParams, StaticRegistrationOptions, WorkDoneProgressParams, TextDocumentRegistrationOptions, WorkDoneProgressOptions } from './protocol';
/**
 * Client capabilities specific to diagnostic pull requests.
 *
 * @since 3.17.0
 */
export type DiagnosticClientCapabilities = {
    /**
     * Whether implementation supports dynamic registration. If this is set to `true`
     * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
     * return value for the corresponding server capability as well.
     */
    dynamicRegistration?: boolean;
    /**
     * Whether the clients supports related documents for document diagnostic pulls.
     */
    relatedDocumentSupport?: boolean;
};
/**
 * Workspace client capabilities specific to diagnostic pull requests.
 *
 * @since 3.17.0
 */
export type DiagnosticWorkspaceClientCapabilities = {
    /**
     * Whether the client implementation supports a refresh request sent from
     * the server to the client.
     *
     * Note that this event is global and will force the client to refresh all
     * pulled diagnostics currently shown. It should be used with absolute care and
     * is useful for situation where a server for example detects a project wide
     * change that requires such a calculation.
     */
    refreshSupport?: boolean;
};
/**
 * Diagnostic options.
 *
 * @since 3.17.0
 */
export type DiagnosticOptions = WorkDoneProgressOptions & {
    /**
     * An optional identifier under which the diagnostics are
     * managed by the client.
     */
    identifier?: string;
    /**
     * Whether the language has inter file dependencies meaning that
     * editing code in one file can result in a different diagnostic
     * set in another file. Inter file dependencies are common for
     * most programming languages and typically uncommon for linters.
     */
    interFileDependencies: boolean;
    /**
     * The server provides support for workspace diagnostics as well.
     */
    workspaceDiagnostics: boolean;
};
/**
 * Diagnostic registration options.
 *
 * @since 3.17.0
 */
export type DiagnosticRegistrationOptions = TextDocumentRegistrationOptions & DiagnosticOptions & StaticRegistrationOptions;
export type $DiagnosticServerCapabilities = {
    diagnosticProvider?: DiagnosticOptions;
};
/**
 * Cancellation data returned from a diagnostic request.
 *
 * @since 3.17.0
 */
export type DiagnosticServerCancellationData = {
    retriggerRequest: boolean;
};
/**
 * @since 3.17.0
 */
export declare namespace DiagnosticServerCancellationData {
    function is(value: any): value is DiagnosticServerCancellationData;
}
/**
 * Parameters of the document diagnostic request.
 *
 * @since 3.17.0
 */
export type DocumentDiagnosticParams = WorkDoneProgressParams & PartialResultParams & {
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The additional identifier  provided during registration.
     */
    identifier?: string;
    /**
     * The result id of a previous response if provided.
     */
    previousResultId?: string;
};
/**
 * The document diagnostic report kinds.
 *
 * @since 3.17.0
 */
export declare namespace DocumentDiagnosticReportKind {
    /**
     * A diagnostic report with a full
     * set of problems.
     */
    const Full = "full";
    /**
     * A report indicating that the last
     * returned report is still accurate.
     */
    const Unchanged = "unchanged";
}
export type DocumentDiagnosticReportKind = 'full' | 'unchanged';
/**
 * A diagnostic report with a full set of problems.
 *
 * @since 3.17.0
 */
export type FullDocumentDiagnosticReport = {
    /**
     * A full document diagnostic report.
     */
    kind: typeof DocumentDiagnosticReportKind.Full;
    /**
     * An optional result id. If provided it will
     * be sent on the next diagnostic request for the
     * same document.
     */
    resultId?: string;
    /**
     * The actual items.
     */
    items: Diagnostic[];
};
/**
 * A full diagnostic report with a set of related documents.
 *
 * @since 3.17.0
 */
export type RelatedFullDocumentDiagnosticReport = FullDocumentDiagnosticReport & {
    /**
     * Diagnostics of related documents. This information is useful
     * in programming languages where code in a file A can generate
     * diagnostics in a file B which A depends on. An example of
     * such a language is C/C++ where marco definitions in a file
     * a.cpp and result in errors in a header file b.hpp.
     *
     * @since 3.17.0
     */
    relatedDocuments?: {
        [uri: DocumentUri]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
    };
};
/**
 * A diagnostic report indicating that the last returned
 * report is still accurate.
 *
 * @since 3.17.0
 */
export type UnchangedDocumentDiagnosticReport = {
    /**
     * A document diagnostic report indicating
     * no changes to the last result. A server can
     * only return `unchanged` if result ids are
     * provided.
     */
    kind: typeof DocumentDiagnosticReportKind.Unchanged;
    /**
     * A result id which will be sent on the next
     * diagnostic request for the same document.
     */
    resultId: string;
};
/**
 * An unchanged diagnostic report with a set of related documents.
 *
 * @since 3.17.0
 */
export type RelatedUnchangedDocumentDiagnosticReport = UnchangedDocumentDiagnosticReport & {
    /**
     * Diagnostics of related documents. This information is useful
     * in programming languages where code in a file A can generate
     * diagnostics in a file B which A depends on. An example of
     * such a language is C/C++ where marco definitions in a file
     * a.cpp and result in errors in a header file b.hpp.
     *
     * @since 3.17.0
     */
    relatedDocuments?: {
        [uri: DocumentUri]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
    };
};
/**
 * The result of a document diagnostic pull request. A report can
 * either be a full report containing all diagnostics for the
 * requested document or an unchanged report indicating that nothing
 * has changed in terms of diagnostics in comparison to the last
 * pull request.
 *
 * @since 3.17.0
 */
export type DocumentDiagnosticReport = RelatedFullDocumentDiagnosticReport | RelatedUnchangedDocumentDiagnosticReport;
/**
 * A partial result for a document diagnostic report.
 *
 * @since 3.17.0
 */
export type DocumentDiagnosticReportPartialResult = {
    relatedDocuments: {
        [uri: DocumentUri]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
    };
};
/**
 * The document diagnostic request definition.
 *
 * @since 3.17.0
 */
export declare namespace DocumentDiagnosticRequest {
    const method: 'textDocument/diagnostic';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentDiagnosticParams, DocumentDiagnosticReport, DocumentDiagnosticReportPartialResult, DiagnosticServerCancellationData, DiagnosticRegistrationOptions>;
    const partialResult: ProgressType<DocumentDiagnosticReportPartialResult>;
    type HandlerSignature = RequestHandler<DocumentDiagnosticParams, DocumentDiagnosticReport, void>;
}
/**
 * A previous result id in a workspace pull request.
 *
 * @since 3.17.0
 */
export type PreviousResultId = {
    /**
     * The URI for which the client knowns a
     * result id.
     */
    uri: DocumentUri;
    /**
     * The value of the previous result id.
     */
    value: string;
};
/**
 * Parameters of the workspace diagnostic request.
 *
 * @since 3.17.0
 */
export type WorkspaceDiagnosticParams = WorkDoneProgressParams & PartialResultParams & {
    /**
     * The additional identifier provided during registration.
     */
    identifier?: string;
    /**
     * The currently known diagnostic reports with their
     * previous result ids.
     */
    previousResultIds: PreviousResultId[];
};
/**
 * A full document diagnostic report for a workspace diagnostic result.
 *
 * @since 3.17.0
 */
export type WorkspaceFullDocumentDiagnosticReport = FullDocumentDiagnosticReport & {
    /**
     * The URI for which diagnostic information is reported.
     */
    uri: DocumentUri;
    /**
     * The version number for which the diagnostics are reported.
     * If the document is not marked as open `null` can be provided.
     */
    version: integer | null;
};
/**
 * An unchanged document diagnostic report for a workspace diagnostic result.
 *
 * @since 3.17.0
 */
export type WorkspaceUnchangedDocumentDiagnosticReport = UnchangedDocumentDiagnosticReport & {
    /**
     * The URI for which diagnostic information is reported.
     */
    uri: DocumentUri;
    /**
     * The version number for which the diagnostics are reported.
     * If the document is not marked as open `null` can be provided.
     */
    version: integer | null;
};
/**
 * A workspace diagnostic document report.
 *
 * @since 3.17.0
 */
export type WorkspaceDocumentDiagnosticReport = WorkspaceFullDocumentDiagnosticReport | WorkspaceUnchangedDocumentDiagnosticReport;
/**
 * A workspace diagnostic report.
 *
 * @since 3.17.0
 */
export type WorkspaceDiagnosticReport = {
    items: WorkspaceDocumentDiagnosticReport[];
};
/**
 * A partial result for a workspace diagnostic report.
 *
 * @since 3.17.0
 */
export type WorkspaceDiagnosticReportPartialResult = {
    items: WorkspaceDocumentDiagnosticReport[];
};
/**
 * The workspace diagnostic request definition.
 *
 * @since 3.17.0
 */
export declare namespace WorkspaceDiagnosticRequest {
    const method: 'workspace/diagnostic';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<WorkspaceDiagnosticParams, WorkspaceDiagnosticReport, WorkspaceDiagnosticReportPartialResult, DiagnosticServerCancellationData, void>;
    const partialResult: ProgressType<WorkspaceDiagnosticReportPartialResult>;
    type HandlerSignature = RequestHandler<WorkspaceDiagnosticParams, WorkspaceDiagnosticReport | null, void>;
}
/**
 * The diagnostic refresh request definition.
 *
 * @since 3.17.0
 */
export declare namespace DiagnosticRefreshRequest {
    const method: `workspace/diagnostic/refresh`;
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType0<void, void, void, void>;
    type HandlerSignature = RequestHandler0<void, void>;
}
