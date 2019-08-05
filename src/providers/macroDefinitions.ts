import * as vscode from 'vscode'
import { Extension } from '../main'
import { checkCommandExists } from '../utils'
import { spawn } from 'child_process'
import { Writable } from 'stream'

export class MacroDefinitions implements vscode.DefinitionProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
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

        let texdefCommand = 'texdef --source --Find --tex latex'
        const packages = this.extension.workshop.completer.command.usedPackages()
        if (/\.sty$/.test(document.uri.fsPath)) {
            packages.push('"' + document.uri.fsPath.replace(/\.sty$/, '') + '"')
        }
        texdefCommand += packages.map(p => ` -p ${p}`).join('')
        const documentClass = this.getDocumentClass(document)
        texdefCommand += ` --class "${documentClass !== null ? documentClass : 'article'}"`
        texdefCommand += ` ${document.getText(command)}`

        const texdefResult = await this.getFirstLineOfOutut(texdefCommand)

        const resultPattern = /% (.+), line (\d+):/
        let result: RegExpMatchArray | null
        if ((result = texdefResult.match(resultPattern)) !== null) {
            return new vscode.Location(vscode.Uri.file(result[1]), new vscode.Position(parseInt(result[2]) - 1, 0))
        } else {
            this.extension.logger.addLogMessage(`Could not find definition for ${document.getText(command)}`)
            return
        }
    }

    private getDocumentClass(document: vscode.TextDocument): string | null {
        const documentClassPattern = /\\documentclass((?:\[[\w-,]+\])?{[\w-]+)}/
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

    private async getFirstLineOfOutut(command: string): Promise<string> {
        return new Promise(resolve => {
            const stream = new Writable()
            stream._write = (chunk, encoding, done) => {
                cmdProcess.kill()
                resolve(chunk.toString().split('\n')[0])
                done()
            }
            const cmdProcess = spawn(command, { shell: true, stdio: 'pipe' })
            cmdProcess.stdout.pipe(stream)
            cmdProcess.stdout.on('error', () => {
                resolve('')
            })
            cmdProcess.stdout.on('end', () => {
                resolve('')
            })
            setTimeout(() => {
                cmdProcess.kill()
            }, 5000)
        })
    }
}
