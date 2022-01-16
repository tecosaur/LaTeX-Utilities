import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as cp from 'child_process'

import { Extension } from '../main'
import { hasTexId } from '../utils'

interface TexCount {
    words: {
        body: number
        headers: number
        captions: number
    }
    instances: {
        headers: number
        floats: number
        math: {
            inline: number
            displayed: number
        }
    }
}

export class WordCounter {
    extension: Extension
    status: vscode.StatusBarItem

    constructor(extension: Extension) {
        this.extension = extension
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10002)
        this.status.command = 'latex-utilities.selectWordcountFormat'
        this.setStatus()
    }

    async counts(merge: boolean = true, file = this.extension.workshop.manager.rootFile()): Promise<TexCount> {
        return new Promise((resolve, _reject) => {
            if (file === undefined) {
                this.extension.logger.addLogMessage('A valid file was not give for TexCount')
                return
            }
            const configuration = vscode.workspace.getConfiguration('latex-utilities.countWord')
            const args = configuration.get('args') as string[]
            if (merge) {
                args.push('-merge')
            }
            args.push('-brief')
            let command = configuration.get('path') as string
            if (configuration.get('docker.enabled')) {
                this.extension.workshop.manager.setEnvVar()
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
                    // just get the last line, ignoring errors
                    stdout = stdout
                        .replace(/\(errors:\d+\)/, '')
                        .split('\n')
                        .map(l => l.trim())
                        .filter(l => l !== '')
                        .slice(-1)[0]
                    this.extension.logger.addLogMessage(`TeXCount output: ${stdout}`)
                    resolve(this.parseTexCount(stdout))
                }
            })
        })
    }

    parseTexCount(text: string): TexCount {
        const reMatch = /^(?<wordsBody>\d+)\+(?<wordsHeaders>\d+)\+(?<wordsCaptions>\d+) \((?<instancesHeaders>\d+)\/(?<instancesFloats>\d+)\/(?<mathInline>\d+)\/(?<mathDisplayed>\d+)\)/.exec(
            text
        )
        if (reMatch !== null) {
            const {
                groups: {
                    /* eslint-disable @typescript-eslint/ban-ts-ignore */
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    wordsBody,
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    wordsHeaders,
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    wordsCaptions,
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    instancesHeaders,
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    instancesFloats,
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    mathInline,
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    mathDisplayed
                    /* eslint-enable @typescript-eslint/ban-ts-ignore */
                }
            } = reMatch

            return {
                words: {
                    body: parseInt(wordsBody),
                    headers: parseInt(wordsHeaders),
                    captions: parseInt(wordsCaptions)
                },
                instances: {
                    headers: parseInt(instancesHeaders),
                    floats: parseInt(instancesFloats),
                    math: {
                        inline: parseInt(mathInline),
                        displayed: parseInt(mathDisplayed)
                    }
                }
            }
        } else {
            throw new Error('String was not valid TexCount output')
        }
    }

    async setStatus() {
        if (
            vscode.window.activeTextEditor === undefined ||
            !hasTexId(vscode.window.activeTextEditor.document.languageId)
        ) {
            this.status.hide()
            return
        } else {
            const template = vscode.workspace.getConfiguration('latex-utilities.countWord').get('format') as string
            if (template === '') {
                this.status.hide()
                return
            }
            const texCount = await this.counts(undefined, vscode.window.activeTextEditor.document.fileName)
            this.status.show()
            this.status.text = this.formatString(texCount, template)
        }
    }

    async pickFormat() {
        const texCount = await this.counts()

        const templates = ['${words} Words', '${headers} Headers', '${floats} Floats', '${math} Equations']
        const options: { [template: string]: string } = {}
        for (const template of templates) {
            options[template] = this.formatString(texCount, template)
        }
        options['custom'] = 'custom'

        const choice = await vscode.window.showQuickPick(Object.values(options), {
            placeHolder: 'Select format to use'
        })

        let format = choice
        if (choice === 'custom') {
            const currentFormat = vscode.workspace.getConfiguration('latex-utilities.countWord').get('format') as string
            format = await vscode.window.showInputBox({
                placeHolder: 'Template',
                value: currentFormat,
                valueSelection: [0, currentFormat.length],
                prompt:
                    'The Template. Feel free to use the following placeholders: \
                    ${wordsBody}, ${wordsHeaders}, ${wordsCaptions}, ${words}, \
                    ${headers}, ${floats}, ${mathInline}, ${mathDisplayed}, ${math}'
            })
        } else {
            for (const template in options) {
                if (options[template] === choice) {
                    format = template
                    break
                }
            }
        }

        if (format !== undefined) {
            vscode.workspace
                .getConfiguration('latex-utilities.countWord')
                .update('format', format, vscode.ConfigurationTarget.Global)
                .then(() => {
                    setTimeout(() => {
                        this.status.text = this.formatString(texCount, format as string)
                    }, 300)
                })
        }
    }

    formatString(texCount: TexCount, template: string) {
        const replacements: { [placeholder: string]: number } = {
            '${wordsBody}': texCount.words.body,
            '${wordsHeaders}': texCount.words.headers,
            '${wordsCaptions}': texCount.words.captions,
            '${words}': texCount.words.body + texCount.words.headers + texCount.words.captions,
            '${headers}': texCount.instances.headers,
            '${floats}': texCount.instances.floats,
            '${mathInline}': texCount.instances.math.inline,
            '${mathDisplayed}': texCount.instances.math.displayed,
            '${math}': texCount.instances.math.inline + texCount.instances.math.displayed
        }
        for (const placeholder in replacements) {
            template = template.replace(placeholder, replacements[placeholder].toString())
        }
        return template
    }
}
