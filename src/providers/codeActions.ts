import * as vscode from 'vscode'
import { Extension } from '../main'

export class CodeActions implements vscode.CodeActionProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        const actions: vscode.CodeAction[] = []

        context.diagnostics
            .filter(d => d.source && this.extension.diagnoser.enabledLinters.indexOf(d.source) !== -1)
            .forEach(d => {
                if (d.source === undefined) {
                    return
                }

                if (this.extension.diagnoser.diagnosticSources[d.source].actions.has(d.range)) {
                    const codeAction = this.extension.diagnoser.diagnosticSources[d.source].actions.get(d.range)
                    if (codeAction !== undefined) {
                        actions.push(codeAction)
                    }
                }
            })

        return actions
    }

    runCodeAction(document: vscode.TextDocument, range: vscode.Range, source: string, message: string) {
        if (this.extension.diagnoser.enabledLinters.indexOf(source) === -1) {
            return
        } else {
            this.extension.diagnoser.diagnosticSources[source].codeAction(document, range, source, message)
        }
    }
}
