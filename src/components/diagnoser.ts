import * as vscode from 'vscode'
import { Extension } from '../main'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { vale } from './linters/vale'
import { LanguageTool } from './linters/languagetool'

export interface IDiagnosticSource {
    command: (fileName: string, extraArguments?: string[]) => string[]
    parser: (file: vscode.TextDocument, commandOutput: string) => void
    codeAction: (document: vscode.TextDocument, range: vscode.Range, source: string, message: string) => void
    diagnostics: vscode.DiagnosticCollection
    actions: Map<vscode.Range, vscode.CodeAction>
    [other: string]: any
    currentProcess?: ChildProcessWithoutNullStreams
}

export class Diagnoser {
    extension: Extension
    diagnosticSources: { [name: string]: IDiagnosticSource } = { vale: vale, LanguageTool: LanguageTool }
    enabledLinters = ['LanguageTool'] // todo: get from user setting

    constructor(extension: Extension) {
        this.extension = extension
    }

    public async lintDocument(document: vscode.TextDocument) {
        for (const linterName of this.enabledLinters) {
            const linter = this.diagnosticSources[linterName]
            const command = linter.command(document.fileName)
            if (linter.currentProcess === undefined) {
                this.extension.logger.addLogMessage(`Running ${linterName} on ${document.fileName}`)
            } else {
                this.extension.logger.addLogMessage(
                    `Refusing to run ${linterName} on ${document.fileName} as this process is already running`
                )
                return
            }
            linter.currentProcess = spawn(command[0], command.slice(1))
            let output = ''
            linter.currentProcess.stdout.on('data', data => {
                output += data
            })
            linter.currentProcess.stdout.on('close', (exitCode: number, _signal: string) => {
                this.extension.logger.addLogMessage(
                    `Running ${linterName} on ${document.fileName} finished with exit code ${exitCode}`
                )
                if (linter.currentProcess !== undefined) {
                    linter.currentProcess.kill()
                }
                linter.currentProcess = undefined
                linter.parser(document, output)
            })
            linter.currentProcess.stdout.on('exit', (exitCode: number, _signal: string) => {
                this.extension.logger.addLogMessage(
                    `Running ${linterName} on ${document.fileName} exited with exit code ${exitCode}`
                )
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
