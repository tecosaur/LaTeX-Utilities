import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import * as util from 'util';

import { Extension } from '../main';
import { hasTexId } from '../utils';

interface TexCount {
    words: {
        body: number
        headers: number
        captions: number
    }
    chars: {
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
    extension: Extension;
    status: vscode.StatusBarItem;

    constructor(extension: Extension) {
        this.extension = extension;
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10002);
        this.status.command = 'latex-utilities.selectWordcountFormat';
        this.setStatus();
    }

    async counts(merge = true, file = vscode.window.activeTextEditor?.document.fileName): Promise<TexCount|undefined> {
        if (file === undefined) {
            this.extension.logger.addLogMessage('A valid file was not give for TexCount');
            return;
        }
        const configuration = vscode.workspace.getConfiguration('latex-utilities.countWord');
        const args = (configuration.get('args') as string[]).slice();
        const execFile = util.promisify(cp.execFile);
        if (merge) {
            args.push('-merge');
        }
        args.push('-brief');
        let command = configuration.get('path') as string;
        if (configuration.get('docker.enabled')) {
            if (process.platform === 'win32') {
                command = path.resolve(this.extension.extensionRoot, './scripts/countword-win.bat');
            } else {
                command = path.resolve(this.extension.extensionRoot, './scripts/countword-linux.sh');
                fs.chmodSync(command, 0o755);
            }
        }
        this.extension.logger.addLogMessage(`TexCount args: ${args}`);
        let stdout; let stderr;
        try {
            ({stdout, stderr} = await execFile(command, args.concat([path.basename(file)]), {
                cwd: path.dirname(file)
            }));

        } catch (err) {
            this.extension.logger.addLogMessage(`Cannot count words: ${err.message}, ${stderr}`);
            this.extension.logger.showErrorMessage(
                'TeXCount failed. Please refer to LaTeX Utilities Output for details.'
            );
            return undefined;
        }
        // just get the last line, ignoring errors
        const stdoutWord = stdout
            .replace(/\(errors:\d+\)/, '')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l !== '')
            .slice(-1)[0];
        this.extension.logger.addLogMessage(`TeXCount output for word: ${stdout}`);
        args.push('-char');
        this.extension.logger.addLogMessage(`TexCount args: ${args}`);
        try {
            ({stdout, stderr} = await execFile(command, args.concat([path.basename(file)]), {
                cwd: path.dirname(file)
            }));
        } catch (err) {
            this.extension.logger.addLogMessage(`Cannot count words: ${err.message}, ${stderr}`);
            this.extension.logger.showErrorMessage(
                'TeXCount failed. Please refer to LaTeX Utilities Output for details.'
            );
            return undefined;
        }
        const stdoutChar = stdout
            .replace(/\(errors:\d+\)/, '')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l !== '')
            .slice(-1)[0];
        this.extension.logger.addLogMessage(`TeXCount output for char: ${stdout}`);
        return this.parseTexCount(stdoutWord, stdoutChar);
    }

    parseTexCount(word: string, char: string): TexCount {
        const reMatchWord = /^(?<wordsBody>\d+)\+(?<wordsHeaders>\d+)\+(?<wordsCaptions>\d+) \((?<instancesHeaders>\d+)\/(?<instancesFloats>\d+)\/(?<mathInline>\d+)\/(?<mathDisplayed>\d+)\)/.exec(
            word
        );
        const reMatchChar = /^(?<charsBody>\d+)\+(?<charsHeaders>\d+)\+(?<charsCaptions>\d+) \((?<instancesHeaders>\d+)\/(?<instancesFloats>\d+)\/(?<mathInline>\d+)\/(?<mathDisplayed>\d+)\)/.exec(
            char
        );
        if (reMatchWord !== null && reMatchChar !== null) {
            const {
                groups: {
                    /* eslint-disable @typescript-eslint/ban-ts-comment */
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
                    /* eslint-enable @typescript-eslint/ban-ts-comment */
                }
            } = reMatchWord;

            const {
                groups: {
                    /* eslint-disable @typescript-eslint/ban-ts-comment */
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    charsBody,
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    charsHeaders,
                    // @ts-ignore: ts _should_ be better with regex groups, but it isn't (yet)
                    charsCaptions,
                    /* eslint-enable @typescript-eslint/ban-ts-comment */
                }
            } = reMatchChar;

            return {
                words: {
                    body: parseInt(wordsBody),
                    headers: parseInt(wordsHeaders),
                    captions: parseInt(wordsCaptions)
                },
                chars: {
                    body: parseInt(charsBody),
                    headers: parseInt(charsHeaders),
                    captions: parseInt(charsCaptions)
                },
                instances: {
                    headers: parseInt(instancesHeaders),
                    floats: parseInt(instancesFloats),
                    math: {
                        inline: parseInt(mathInline),
                        displayed: parseInt(mathDisplayed)
                    }
                }
            };
        } else {
            throw new Error('String was not valid TexCount output');
        }
    }

    async setStatus() {
        if (
            vscode.window.activeTextEditor === undefined ||
            !hasTexId(vscode.window.activeTextEditor.document.languageId)
        ) {
            this.status.hide();
            return;
        } else {
            const template = vscode.workspace.getConfiguration('latex-utilities.countWord').get('format') as string;
            if (template === '') {
                this.status.hide();
                return;
            }
            const texCount = await this.counts(undefined, vscode.window.activeTextEditor.document.fileName);
            this.status.show();
            this.status.text = this.formatString(texCount, template);
        }
    }

    async pickFormat() {
        const texCount = await this.counts();

        const templates = [
            '${words} Words', '${wordsBody} Words', '${chars} Chars', '${charsBody} Chars', '${headers} Headers', '${floats} Floats', '${math} Equations', 'custom'];
        const options: { [template: string]: string } = {};
        for (const template of templates) {
            options[template] = this.formatString(texCount, template);
            if (template.startsWith('${wordsBody}') || template.startsWith('${charsBody}')) {
                options[template] += ' (body only)';
            }
        }

        const choice = await vscode.window.showQuickPick(Object.values(options), {
            placeHolder: 'Select format to use'
        });

        let format = choice;
        if (choice === 'custom') {
            const currentFormat = vscode.workspace.getConfiguration('latex-utilities.countWord').get('format') as string;
            format = await vscode.window.showInputBox({
                placeHolder: 'Template',
                value: currentFormat,
                valueSelection: [0, currentFormat.length],
                prompt:
                    'The Template. Feel free to use the following placeholders: \
                    ${wordsBody}, ${wordsHeaders}, ${wordsCaptions}, ${words}, \
                    ${charsBody}, ${charsHeaders}, ${charsCaptions}, ${chars}, \
                    ${headers}, ${floats}, ${mathInline}, ${mathDisplayed}, ${math}'
            });
        } else {
            for (const template in options) {
                if (options[template] === choice) {
                    format = template;
                    break;
                }
            }
        }

        if (format !== undefined) {
            vscode.workspace
                .getConfiguration('latex-utilities.countWord')
                .update('format', format, vscode.ConfigurationTarget.Global)
                .then(() => {
                    setTimeout(() => {
                        this.status.text = this.formatString(texCount, format as string);
                    }, 300);
                });
        }
    }

    formatString(texCount: TexCount | undefined, template: string) {
        if (texCount === undefined) {
            return '...';
        }
        const replacements: { [placeholder: string]: number } = {
            '${wordsBody}': texCount.words.body,
            '${wordsHeaders}': texCount.words.headers,
            '${wordsCaptions}': texCount.words.captions,
            '${charsBody}': texCount.chars.body,
            '${charsHeaders}': texCount.chars.headers,
            '${charsCaptions}': texCount.chars.captions,
            '${words}': texCount.words.body + texCount.words.headers + texCount.words.captions,
            '${chars}': texCount.chars.body + texCount.chars.headers + texCount.chars.captions,
            '${headers}': texCount.instances.headers,
            '${floats}': texCount.instances.floats,
            '${mathInline}': texCount.instances.math.inline,
            '${mathDisplayed}': texCount.instances.math.displayed,
            '${math}': texCount.instances.math.inline + texCount.instances.math.displayed
        };
        for (const placeholder in replacements) {
            template = template.replace(placeholder, replacements[placeholder].toString());
        }
        return template;
    }
}
