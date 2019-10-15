import * as vscode from 'vscode'
import { Extension } from '../main'
import { execFile } from 'child_process'
import { vale } from './linters/vale'
import { LanguageTool } from './linters/languagetool'

export interface IDiagnosticSource {
    command: (fileName: string, extraArguments?: string[]) => string[]
    parser: (file: vscode.TextDocument, commandOutput: string) => void
    codeAction: (document: vscode.TextDocument, range: vscode.Range, source: string, message: string) => void
    diagnostics: vscode.DiagnosticCollection
    actions: Map<vscode.Range, vscode.CodeAction>
    [other: string]: any
}

export class Diagnoser {
    extension: Extension
    diagnosticSources: { [name: string]: IDiagnosticSource } = { vale: vale, LanguageTool: LanguageTool }
    enabledLinters = ['LanguageTool'] // todo: get from user setting

    constructor(extension: Extension) {
        this.extension = extension
    }

    public lintDocument(document: vscode.TextDocument) {
        for (const linterName of this.enabledLinters) {
            const linter = this.diagnosticSources[linterName]
            const command = linter.command(document.fileName)
            execFile(command[0], command.slice(1), (error, stdout) => {
                if (error) {
                    console.error('Command error', command, error)
                } else {
                    linter.parser(document, stdout)
                }
            })
        }
    }

    private latexToPlaintext(fileName: string) {
        // tbd
    }
    private translatePlaintextPosition(fileName: string, position: vscode.Position) {
        // tdb
    }
}
