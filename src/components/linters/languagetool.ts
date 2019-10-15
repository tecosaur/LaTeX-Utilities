import * as vscode from 'vscode'
import { IDiagnosticSource } from '../diagnoser'

// https://languagetool.org/http-api/swagger-ui/#!/default/post_check
interface ILanguageToolJSON {
    readonly message: string
    readonly shortMessage: string
    readonly offset: number
    readonly length: number
    readonly replacements: { value: string }[]
    // readonly context: {text: string, offset: number, length: number}
    // readonly sentence: string
    // readonly rule: {id: string, subId: string, description: string, urls: {value: string}, issueType:string, category:{id:string,name:string}}
}

export const LanguageTool: IDiagnosticSource = {
    command: (fileName: string, extraArguments: string[] = []) => [
        'languagetool',
        '--json',
        ...extraArguments,
        fileName
    ],
    actions: new Map(),
    diagnostics: vscode.languages.createDiagnosticCollection('LanguageTool'),
    codeAction: (document, range, _code, replacement) => {
        if (!vscode.window.activeTextEditor) {
            return
        }
        vscode.window.activeTextEditor.edit(
            editBuilder => {
                editBuilder.replace(range, replacement)
            },
            { undoStopBefore: true, undoStopAfter: true }
        )
    },
    parser: function(document, commandOutput) {
        this.diagnostics.clear()
        this.actions.clear()

        const diagnostics: vscode.Diagnostic[] = []
        const result: ILanguageToolJSON[] = JSON.parse(commandOutput)['matches']
        const processDiagnostic = (issue: ILanguageToolJSON) => {
            // LanguageTool prints one-based locations but code wants zero-based, so adjust
            // accordingly
            const range = new vscode.Range(
                document.positionAt(issue.offset),
                document.positionAt(issue.offset + issue.length)
            )
            const message = issue.message

            let diagnostic = new vscode.Diagnostic(
                range,
                message
                // {
                //     suggestion: vscode.DiagnosticSeverity.Hint,
                //     warning: vscode.DiagnosticSeverity.Warning,
                //     error: vscode.DiagnosticSeverity.Warning
                // }[issue.Severity]
            )
            diagnostic.source = 'LanguageTool'
            // diagnostic.code = issue.Check

            if (Object.keys(issue.replacements).length !== 0) {
                for (const replacement of issue.replacements) {
                    const codeAction = new vscode.CodeAction(
                        `Replace with '${replacement.value}'`,
                        vscode.CodeActionKind.QuickFix
                    )
                    codeAction.command = {
                        title: 'Replace value',
                        command: 'latex-utilities.code-action',
                        arguments: [document, diagnostic.range, diagnostic.source, replacement.value]
                    }
                    this.actions.set(diagnostic.range, codeAction)
                }
            }

            diagnostics.push(diagnostic)
        }

        for (const issue of result) {
            processDiagnostic(issue)
        }

        this.diagnostics.set(document.uri, diagnostics)
    }
}
