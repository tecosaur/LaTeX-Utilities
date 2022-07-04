import * as vscode from 'vscode'
import { Extension } from '../main'
import { checkCommandExists } from '../utils'
import { spawn } from 'child_process'

export class MacroDefinitions implements vscode.DefinitionProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ) {
        const enabled = vscode.workspace.getConfiguration('latex-utilities.texdef').get('enabled')
        if (!enabled) {
            return
        }

        const line = document.lineAt(position.line)
        let command: vscode.Range | undefined

        const pattern = /\\[\w@]+/g
        let match = pattern.exec(line.text)
        while (match !== null) {
            const matchStart = line.range.start.translate(0, match.index)
            const matchEnd = matchStart.translate(0, match[0].length)
            const matchRange = new vscode.Range(matchStart, matchEnd)

            if (matchRange.contains(position)) {
                command = matchRange
                break
            }
            match = pattern.exec(line.text)
        }

        if (command === undefined) {
            return
        }

        checkCommandExists('texdef')

        const texdefOptions = ['--source', '--Find', '--tex', 'latex']
        const packages = this.extension.manager.usedPackages(document)
        if (/\.sty$/.test(document.uri.fsPath)) {
            texdefOptions.push(document.uri.fsPath.replace(/\.sty$/, ''))
        }
        texdefOptions.push(...[...packages].map(p => ['-p', p]).reduce((prev, next) => prev.concat(next), []))
        const documentClass = this.getDocumentClass(document)
        texdefOptions.push('--class', documentClass !== null ? documentClass : 'article')
        texdefOptions.push(document.getText(command))

        const texdefResult = await this.getFirstLineOfOutput('texdef', texdefOptions)

        const resultPattern = /% (.+), line (\d+):/
        let result: RegExpMatchArray | null
        if ((result = texdefResult.match(resultPattern)) !== null) {
            this.extension.telemetryReporter.sendTelemetryEvent('texdef')
            return new vscode.Location(vscode.Uri.file(result[1]), new vscode.Position(parseInt(result[2]) - 1, 0))
        } else {
            vscode.window.showWarningMessage(`Could not find definition for ${document.getText(command)}`)
            this.extension.logger.addLogMessage(`Could not find definition for ${document.getText(command)}`)
            return
        }
    }

    private getDocumentClass(document: vscode.TextDocument): string | null {
        const documentClassPattern = /\\documentclass((?:\[[\w-,]*\])?{[\w-]+)}/
        let documentClass: RegExpMatchArray | null
        let line = 0
        while (line < 50 && line < document.lineCount) {
            const lineContents = document.lineAt(line++).text
            if ((documentClass = lineContents.match(documentClassPattern)) !== null) {
                return documentClass[1].replace(/{([\w-]+)$/, '$1')
            }
        }
        return null
    }

    private async getFirstLineOfOutput(command: string, options: string[]): Promise<string> {
        return new Promise(resolve => {
            const startTime = +new Date()
            this.extension.logger.addLogMessage(`Running command ${command} ${options.join(' ')}`)
            const cmdProcess = spawn(command, options)
            cmdProcess.stdout.on('data', data => {
                this.extension.logger.addLogMessage(
                    `Took ${+new Date() - startTime}ms to find definition for ${options[options.length - 1]}`
                )
                cmdProcess.kill()
                resolve(data.toString())
            })
            cmdProcess.stdout.on('error', () => {
                this.extension.logger.addLogMessage(`Error running texdef for ${options[options.length - 1]}}`)
                resolve('')
            })
            cmdProcess.stdout.on('end', () => {
                resolve('')
            })
            setTimeout(() => {
                cmdProcess.kill()
            }, 6000)
        })
    }
}
