import * as vscode from 'vscode'
import { Extension } from '../main'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as path from 'path'
import { tmpdir } from 'os'
import { getClosingBracket } from '../utils'

import { vale } from './linters/vale'
import { LanguageTool } from './linters/languagetool'

export interface IDiagnosticSource {
    command: (fileName: string, extraArguments?: string[]) => string[]
    parser: (
        file: vscode.TextDocument,
        temp_file: string,
        commandOutput: string,
        changes: [vscode.Range, number][]
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
    private changes: [vscode.Range, number][] = []

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

    public async lintDocument(document?: vscode.TextDocument) {
        // separate because typescript was annoying when this logic was in the main function
        if (document === undefined) {
            if (vscode.window.activeTextEditor) {
                document = vscode.window.activeTextEditor.document
            } else {
                return new Error('No active document to lint')
            }
        }
        return this.lintTheDocument(document)
    }

    private async lintTheDocument(document: vscode.TextDocument) {
        if (!this.initalised) {
            await this.cleanupTempDir()
            if (!fs.existsSync(path.join(tmpdir(), this.TEMPFOLDER_NAME))) {
                await fs.mkdirSync(path.join(tmpdir(), this.TEMPFOLDER_NAME))
            }
            this.initalised = true
        }
        this.changes = []
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
                linter.parser(document, this.tempfile, output, this.changes)
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
        let str = document.getText()
        /**
         * command: transparencyLevel, with
         * 0 - none
         * 1 - mandatory only
         * 2 - optional only
         * 3 - both
         */
        const transparentCommands: { [command: string]: number } = {
            emph: 1,
            textit: 1,
            textbf: 1,
            textsl: 1,
            textsc: 1,
            part: 1,
            chapter: 1,
            section: 1,
            subsection: 1,
            subsubsection: 1,
            paragraph: 1,
            subparagraph: 1,
            acr: 1
        }
        const opaqueEnvs = ['align', 'equation', 'figure', 'theorem', 'minted', 'figure', 'table', 'tabular']
        const transparentEnvArguments: { [env: string]: number } = {}

        const replacements: [number, number, string][] = []
        const queueReplacement = (start: number, end: number, replacement: string) => {
            replacements.push([start, end, replacement])
            this.changes.push([
                new vscode.Range(document.positionAt(start), document.positionAt(end)),
                replacement.length
            ])
        }
        const replaceCommand = (command: { text: string; start: number }, args: { start: number; end: number }[]) => {
            queueReplacement(
                command.start - 1,
                command.start +
                    command.text.length +
                    (args.length === 1 && [' ', '\n'].includes(str[command.start + command.text.length]) ? 1 : 0),
                ''
            )
            if (transparentCommands.hasOwnProperty(command.text.replace(/\*$/, ''))) {
                const transparencyLevel = transparentCommands[command.text.replace(/\*$/, '')]
                replaceArgs(args, transparencyLevel)
            } else {
                replaceArgs(args, 0)
            }
        }
        const replaceArgs = (args: { start: number; end: number }[], transparencyLevel: number) => {
            if (args.length === 0) {
                return
            }
            args.forEach(arg => {
                if (str[arg.start] === '{' && [1, 3].includes(transparencyLevel)) {
                    // mandatory arg, and supposed to be passed through
                    queueReplacement(arg.start, arg.end, str.substring(arg.start + 1, arg.end - 1))
                } else if (str[arg.start] === '[' && [2, 3].includes(transparencyLevel)) {
                    // optional arg, and supposed to be passed through
                    queueReplacement(arg.start, arg.end, str.substring(arg.start + 1, arg.end - 1))
                } else {
                    queueReplacement(arg.start, arg.end, '')
                }
            })
            ignoreUntil = Math.max(ignoreUntil, args[args.length - 1].end)
        }
        const processEnv = (regexMatch: RegExpExecArray, args: { start: number; end: number }[]) => {
            const env = str.substring(args[0].start + 1, args[0].end - 1)
            const envCloseCommand = `\\end{${env}}`
            const envClose = str.indexOf(envCloseCommand)
            queueReplacement(regexMatch.index + regexMatch[0].indexOf(regexMatch[1]) - 1, args[0].end, '') // remove \begin{env}
            const transparencyLevel = transparentEnvArguments.hasOwnProperty(env.replace(/\*$/, ''))
                ? transparentEnvArguments[env.replace(/\*$/, '')]
                : 0
            replaceArgs(args.slice(1), transparencyLevel)
            if (opaqueEnvs.includes(env.replace(/\*$/, ''))) {
                queueReplacement(args[args.length - 1].end, envClose + envCloseCommand.length, '')
                ignoreUntil = Math.max(ignoreUntil, envClose + envCloseCommand.length)
            }
        }

        const regexReplacements: [RegExp, string][] = [
            [/.*[^\\]\\begin{document}/gs, ''],
            [/(^|[^\\])\\end{document}.*/gs, '$1']
        ]

        for (let i = 0; i < regexReplacements.length; i++) {
            let match

            while ((match = regexReplacements[i][0].exec(document.getText()))) {
                this.changes.push([
                    new vscode.Range(
                        document.positionAt(match.index),
                        document.positionAt(regexReplacements[i][0].lastIndex - 1)
                    ),
                    1
                ])
            }
            str = str.replace(regexReplacements[i][0], regexReplacements[i][1])
        }

        const commandRegex = /\\([\(\)\[\]]|[\w@]+\*?)/gs
        let ignoreUntil = 0

        let result: RegExpExecArray | null
        while ((result = commandRegex.exec(str)) !== null) {
            if (result.index < ignoreUntil || (result.index > 0 && str[result.index - 1] === '\\')) {
                continue
            }

            const command = result[1]

            if (command === '(') {
                const close = str.indexOf('\\)', result.index + 1) + 2
                queueReplacement(result.index + result[0].indexOf(command), close, '')
                ignoreUntil = Math.max(ignoreUntil, close)
                continue
            } else if (command === '[') {
                const close = str.indexOf('\\]', result.index + 1) + 2
                queueReplacement(result.index + result[0].indexOf(command), close, '')
                ignoreUntil = Math.max(ignoreUntil, close)
                continue
            }

            let args = []

            let argumentTest = result.index + result[0].length
            let nextChar = str[argumentTest]
            let argumentEnd: number
            while (['{', '['].includes(nextChar)) {
                argumentEnd = getClosingBracket(str, argumentTest)
                args.push({ start: argumentTest, end: argumentEnd + 1 })
                argumentTest = argumentEnd + 1
                if (str[argumentTest] === '\n') {
                    argumentTest++
                }
                nextChar = str[argumentTest]
            }

            if (command === 'begin') {
                processEnv(result, args)
                continue
            }

            replaceCommand({ text: command, start: result.index + result[0].indexOf(command) }, args)
        }

        let removedSoFar = 0
        replacements.forEach(rep => {
            str = str.substr(0, rep[0] - removedSoFar) + rep[2] + str.substr(rep[1] - removedSoFar)
            removedSoFar += rep[1] - rep[0] - rep[2].length
        })

        // Save temporary file
        this.tempfile = path.join(tmpdir(), this.TEMPFOLDER_NAME, `diagnoser-${path.basename(document.uri.fsPath)}`)
        fs.writeFileSync(this.tempfile, str)
        console.log(this.tempfile)
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
