import * as vscode from 'vscode'
import { Extension } from '../main'
import { execFile } from 'child_process'
import { vale } from './linters/vale'

export interface IDiagnosticSource {
    command: (fileName: string) => string[]
    parser: (file: vscode.Uri, commandOutput: string) => void
    codeAction: (document: vscode.TextDocument, range: vscode.Range, code: number, message: string) => void
    diagnostics: vscode.DiagnosticCollection
}

const diagnosticSources: { [name: string]: IDiagnosticSource } = { vale }

export class Diagnoser {
    extension: Extension
    enabledLinters = ['vale'] // todo: get from user setting

    constructor(extension: Extension) {
        this.extension = extension
    }

    public lintDocument(document: vscode.TextDocument) {
        for (const linterName of this.enabledLinters) {
            const linter = diagnosticSources[linterName]
            const command = linter.command(document.fileName)
            execFile(command[0], command.slice(1), (error, stdout) => {
                if (error) {
                    console.error('Command error', command, error)
                } else {
                    linter.parser(document.uri, stdout)
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
