import * as vscode from 'vscode'
import { Extension } from '../main'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as path from 'path'
import { tmpdir } from 'os'
import { vale } from './linters/vale'
import { LanguageTool } from './linters/languagetool'

export interface IDiagnosticSource {
    command: (fileName: string, extraArguments?: string[]) => string[]
    parser: (
        file: vscode.TextDocument,
        temp_file: string,
        commandOutput: string,
        offsets: [number, number, number, number][]
    ) => void
    codeAction: (document: vscode.TextDocument, range: vscode.Range, source: string, message: string) => void
    diagnostics: vscode.DiagnosticCollection
    actions: Map<vscode.Range, vscode.CodeAction>
    [other: string]: any
    currentProcess?: ChildProcessWithoutNullStreams
}

export class Diagnoser {
    extension: Extension
    diagnosticSources: { [name: string]: IDiagnosticSource } = { vale: vale, LanguageTool: LanguageTool }
    enabledLinters: string[]
    lintersArgs: { [name: string]: string[] }

    private TEMPFOLDER_NAME = 'vscode-latexworkshop'
    private tempfile = ''
    private initalised = false
    // Position of replace : [Line number,number of deleted lines, position of first replaced character in the line, length of replacement]
    private offsets: [number, number, number, number][] = []

    constructor(extension: Extension) {
        this.extension = extension
        // not calling updateConfig() because that doesn't make tslint happy
        const linterConfig = vscode.workspace.getConfiguration('latex-utilities.linter')
        this.enabledLinters = linterConfig.get('providers') as string[]
        this.lintersArgs = linterConfig.get('arguments') as { [name: string]: string[] }
    }

    private updateConfig() {
        const linterConfig = vscode.workspace.getConfiguration('latex-utilities.linter')
        this.enabledLinters = linterConfig.get('providers') as string[]
        this.lintersArgs = linterConfig.get('arguments') as { [name: string]: string[] }
    }

    public async lintDocument(document: vscode.TextDocument) {
        if (!this.initalised) {
            await this.cleanupTempDir()
            if (!fs.existsSync(path.join(tmpdir(), this.TEMPFOLDER_NAME))) {
                await fs.mkdirSync(path.join(tmpdir(), this.TEMPFOLDER_NAME))
            }
            this.initalised = true
        }
        this.offsets = []
        this.latexToPlaintext(document)

        for (const linterName of this.enabledLinters) {
            console.log(linterName)
            const linter = this.diagnosticSources[linterName]

            const extraArgs = linterName in this.lintersArgs ? this.lintersArgs[linterName] : []
            const command = linter.command(this.tempfile, extraArgs)
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
                linter.parser(document, this.tempfile, output, this.offsets)
            })
            linter.currentProcess.stdout.on('exit', (exitCode: number, _signal: string) => {
                this.extension.logger.addLogMessage(
                    `Running ${linterName} on ${document.fileName} exited with exit code ${exitCode}`
                )
            })
        }

        this.updateConfig()
    }

    private latexToPlaintext(document: vscode.TextDocument) {
        // Copy
        var str = document.getText()

        // Get position
        var list_regex = [/\\\(.*?\\\)/g, /\$.*?\$/g, /\\cref\{.*?\}/g, /\\begin{(.*?)}.*?\\end{\1}/gs]

        for (let i = 0; i < list_regex.length; i++) {
            let regex = list_regex[i]
            var result

            // Replace by matchAll...
            while ((result = regex.exec(document.getText()))) {
                // Get line
                let line = (
                    document
                        .getText()
                        .substr(0, result.index)
                        .match(/\n/g) || []
                ).length

                // Get first character of the line
                let first_char_pos = document
                    .getText()
                    .substr(0, result.index)
                    .lastIndexOf('\n')
                if (first_char_pos == -1) {
                    first_char_pos = 0
                } else {
                    first_char_pos += 1
                }

                // Get number of deleted lines
                let nb_deleted_lines = (
                    document
                        .getText()
                        .substr(first_char_pos, regex.lastIndex - first_char_pos)
                        .match(/\n/g) || []
                ).length

                // Save
                this.offsets.push([
                    line,
                    nb_deleted_lines,
                    result.index - first_char_pos,
                    regex.lastIndex - result.index
                ])
            }

            str = str.replace(regex, 'X')
        }

        // Sort by increasing number of lines, and increasing position of the first replaced character
        this.offsets.sort((a, b) => {
            if (a[0] == b[0]) return a[2] - b[2]
            else return a[0] - b[0]
        })

        // Save temporary file
        this.tempfile = path.join(tmpdir(), this.TEMPFOLDER_NAME, `diagnoser-${path.basename(document.uri.fsPath)}`)

        fs.writeFileSync(this.tempfile, str)
    }
    // private translatePlaintextPosition(linter: IDiagnosticSource) {
    //     linter.actions.forEach(
    //         (value : vscode.CodeAction, key: vscode.Range) => {
    //             console.log(key,value)
    //             for (let key_offset in this.offsets){
    //                 let value = this.offsets[key_offset]
    //             }
    //         }
    //     );

    // }

    public async cleanupTempDir() {
        await fse.removeSync(path.join(tmpdir(), this.TEMPFOLDER_NAME))
    }
}
