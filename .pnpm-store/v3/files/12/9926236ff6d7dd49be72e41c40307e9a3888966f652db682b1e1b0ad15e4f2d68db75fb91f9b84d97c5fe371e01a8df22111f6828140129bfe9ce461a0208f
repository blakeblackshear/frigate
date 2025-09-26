import { CancellationToken, ProgressToken, ProgressType, WorkDoneProgressParams, PartialResultParams } from 'vscode-languageserver-protocol';
import type { Feature, _RemoteWindow } from './server';
export interface ProgressContext {
    sendProgress<P>(type: ProgressType<P>, token: ProgressToken, value: P): void;
}
export interface WorkDoneProgressReporter {
    begin(title: string, percentage?: number, message?: string, cancellable?: boolean): void;
    report(percentage: number): void;
    report(message: string): void;
    report(percentage: number, message: string): void;
    done(): void;
}
export interface WorkDoneProgressServerReporter extends WorkDoneProgressReporter {
    readonly token: CancellationToken;
}
export interface WindowProgress {
    attachWorkDoneProgress(token: ProgressToken | undefined): WorkDoneProgressReporter;
    createWorkDoneProgress(): Promise<WorkDoneProgressServerReporter>;
}
export declare function attachWorkDone(connection: ProgressContext, params: WorkDoneProgressParams | undefined): WorkDoneProgressReporter;
export declare const ProgressFeature: Feature<_RemoteWindow, WindowProgress>;
export interface ResultProgressReporter<R> {
    report(data: R): void;
}
export declare function attachPartialResult<R>(connection: ProgressContext, params: PartialResultParams): ResultProgressReporter<R> | undefined;
