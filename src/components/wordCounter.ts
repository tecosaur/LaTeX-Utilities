import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as cp from 'child_process'

import { Extension } from '../main'

export class WordCounter {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    async count(merge: boolean = true) {
        const file = this.extension.workshop.getRootFile()
        if (file === undefined) {
            this.extension.logger.addLogMessage('LaTeX Workshop does not provide a valid root file.')
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-utilities.countWord')
        const args = configuration.get('args') as string[]
        if (merge) {
            args.push('-merge')
        }
        let command = configuration.get('path') as string
        if (configuration.get('docker.enabled')) {
            this.extension.workshop.setEnvVar()
            if (process.platform === 'win32') {
                command = path.resolve(this.extension.extensionRoot, './scripts/countword-win.bat')
            } else {
                command = path.resolve(this.extension.extensionRoot, './scripts/countword-linux.sh')
                fs.chmodSync(command, 0o755)
            }
        }
        const proc = cp.spawn(command, args.concat([path.basename(file)]), { cwd: path.dirname(file) })
        proc.stdout.setEncoding('utf8')
        proc.stderr.setEncoding('utf8')

        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })

        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })

        proc.on('error', err => {
            this.extension.logger.addLogMessage(`Cannot count words: ${err.message}, ${stderr}`)
            this.extension.logger.showErrorMessage(
                'TeXCount failed. Please refer to LaTeX Utilities Output for details.'
            )
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Cannot count words, code: ${exitCode}, ${stderr}`)
                this.extension.logger.showErrorMessage(
                    'TeXCount failed. Please refer to LaTeX Utilities Output for details.'
                )
            } else {
                const words = /Words in text: ([0-9]*)/g.exec(stdout)
                const floats = /Number of floats\/tables\/figures: ([0-9]*)/g.exec(stdout)
                if (words) {
                    let floatMsg = ''
                    if (floats && parseInt(floats[1]) > 0) {
                        floatMsg = `and ${floats[1]} float${
                            parseInt(floats[1]) > 1 ? 's' : ''
                        } (tables, figures, etc.) `
                    }
                    vscode.window.showInformationMessage(
                        `There are ${words[1]} words ${floatMsg}in the ${
                            merge ? 'LaTeX project' : 'opened LaTeX file'
                        }.`
                    )
                }
                this.extension.logger.addLogMessage(`TeXCount log:\n${stdout}`)
            }
        })
    }
}
