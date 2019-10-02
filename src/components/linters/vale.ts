import * as vscode from 'vscode'
import { IDiagnosticSource } from '../diagnoser'

interface IValeJSON {
    readonly Check: string
    readonly Context: string
    readonly Description: string
    readonly Line: number
    readonly Link: string
    readonly Message: string
    readonly Span: [number, number]
    readonly Severity: 'suggestion' | 'warning' | 'error'
}

export const vale: IDiagnosticSource = {
    command: (fileName: string) => ['vale', '--no-exit', '--output', 'JSON', fileName],
    parser: function(file, commandOutput) {
        this.diagnostics.clear()
        const diagnostics: vscode.Diagnostic[] = []

        const result: IValeJSON[] = JSON.parse(commandOutput)[file.fsPath]

        const processDiagnostic = (error: IValeJSON) => {
            // vale prints one-based locations but code wants zero-based, so adjust
            // accordingly
            const range = new vscode.Range(error.Line - 1, error.Span[0] - 1, error.Line - 1, error.Span[1])
            const message = error.Link
                ? `${error.Message} (${error.Check}, see ${error.Link})`
                : `${error.Message} (${error.Check})`
            const diagnostic = new vscode.Diagnostic(
                range,
                message,
                {
                    suggestion: vscode.DiagnosticSeverity.Hint,
                    warning: vscode.DiagnosticSeverity.Warning,
                    error: vscode.DiagnosticSeverity.Error
                }[error.Severity]
            )
            diagnostic.source = 'vale'
            diagnostic.code = error.Check
            diagnostics.push(diagnostic)
        }

        for (const issue of result) {
            processDiagnostic(issue)
        }

        this.diagnostics.set(file, diagnostics)
    },
    codeAction: () => {},
    diagnostics: vscode.languages.createDiagnosticCollection('vale')
}
