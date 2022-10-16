import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import { Logger } from './components/logger'
import { CompletionWatcher, Completer } from './components/completionWatcher'
import { Paster } from './components/paster'
import { WordCounter } from './components/wordCounter'
import { MacroDefinitions } from './providers/macroDefinitions'
import { Zotero } from './components/zotero'
import * as utils from './utils'

import TelemetryReporter from 'vscode-extension-telemetry'
import { Manager } from './workshop/manager'

let extension: Extension

export function activate(context: vscode.ExtensionContext) {
    extension = new Extension()

    extension.logger.addLogMessage('LaTeX Utilities Started')

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-utilities.editLiveSnippetsFile', () =>
            extension.withTelemetry('editLiveSnippetsFile', () => {
                extension.completionWatcher.editSnippetsFile()
            })
        ),
        vscode.commands.registerCommand('latex-utilities.resetLiveSnippetsFile', () =>
            extension.withTelemetry('resetLiveSnippetsFile', () => {
                extension.completionWatcher.resetSnippetsFile()
            })
        ),
        vscode.commands.registerCommand('latex-utilities.compareLiveSnippetsFile', () =>
            extension.withTelemetry('compareLiveSnippetsFile', () => {
                extension.completionWatcher.compareSnippetsFile()
            })
        ),
        vscode.commands.registerCommand('latex-utilities.formattedPaste', () =>
            extension.withTelemetry('formattedPaste', () => {
                extension.paster.paste()
            })
        ),
        vscode.commands.registerCommand('latex-utilities.citeZotero', () =>
            extension.withTelemetry('citeZotero', () => {
                extension.zotero.cite()
            })
        ),
        vscode.commands.registerCommand('latex-utilities.openInZotero', () =>
            extension.withTelemetry('openInZotero', () => {
                extension.zotero.openCitation()
            })
        ),
        vscode.commands.registerCommand('latex-utilities.selectWordcountFormat', () =>
            extension.withTelemetry('selectWordcountFormat', () => {
                extension.wordCounter.pickFormat()
            })
        ),
    )

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(
            (e: vscode.TextDocumentChangeEvent) => {
                if (utils.hasTexId(e.document.languageId)) {
                    extension.withTelemetry('onDidChangeTextDocument', () => extension.completionWatcher.watcher(e))
                }
            }
        ),
        vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
            if (e.uri.fsPath === extension.completionWatcher.snippetFile.user) {
                extension.withTelemetry('onDidSaveTextDocument_updateSnippet', () => extension.completionWatcher.loadSnippets(true))
            } else {
                extension.withTelemetry('onDidSaveTextDocument_tex_wordcounter', () => extension.wordCounter.setStatus())
            }
        }),
        vscode.workspace.onDidCloseTextDocument((e: vscode.TextDocument) => {
            if (e.uri.fsPath.includes(extension.completionWatcher.snippetFile.user)) {
                extension.withTelemetry('onDidCloseTextDocument_determineIfUserSnippetsRedundant', () => extension.completionWatcher.determineIfUserSnippetsRedundant())
            }
        }),
        vscode.window.onDidChangeActiveTextEditor((_e: vscode.TextEditor | undefined) => {
            extension.withTelemetry('onDidChangeActiveTextEditor_tex_wordcounter', () => extension.wordCounter.setStatus())
        })
    )

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex' }, extension.completer),
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'latex' }, extension.completer),
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'doctex' }, extension.completer),
        vscode.languages.registerDefinitionProvider(
            { language: 'latex', scheme: 'file' },
            new MacroDefinitions(extension)
        )
    )

    newVersionMessage(context.extensionPath)
    context.subscriptions.push(extension.telemetryReporter)
}

export function deactivate() {
    extension.telemetryReporter.dispose()
}

function newVersionMessage(extensionPath: string) {
    fs.readFile(`${extensionPath}${path.sep}package.json`, (err, data) => {
        if (err) {
            extension.logger.addLogMessage('Cannot read package information.')
            return
        }
        extension.packageInfo = JSON.parse(data.toString())
        extension.logger.addLogMessage(`LaTeX Utilities version: ${extension.packageInfo.version}`)
        if (
            fs.existsSync(`${extensionPath}${path.sep}VERSION`) &&
            fs.readFileSync(`${extensionPath}${path.sep}VERSION`).toString() === extension.packageInfo.version
        ) {
            return
        }
        fs.writeFileSync(`${extensionPath}${path.sep}VERSION`, extension.packageInfo.version)
        const configuration = vscode.workspace.getConfiguration('latex-utilities')
        if (!(configuration.get('message.update.show') as boolean)) {
            return
        }
        vscode.window
            .showInformationMessage(
                `LaTeX Utilities updated to version ${extension.packageInfo.version}.`,
                'Change log',
                'Star the project',
                'Disable this message forever'
            )
            .then(option => {
                switch (option) {
                    case 'Change log':
                        vscode.commands.executeCommand(
                            'markdown.showPreview',
                            vscode.Uri.file(`${extensionPath}${path.sep}CHANGELOG.md`)
                        )
                        break
                    case 'Star the project':
                        vscode.commands.executeCommand(
                            'vscode.open',
                            vscode.Uri.parse('https://github.com/tecosaur/LaTeX-Utilities/')
                        )
                        break
                    case 'Disable this message forever':
                        configuration.update('message.update.show', false, true)
                        break
                    default:
                        break
                }
            })
    })
}

export class Extension {
    extensionRoot: string
    packageInfo: any
    telemetryReporter: TelemetryReporter
    // workshop: LaTeXWorkshopAPI
    logger: Logger
    completionWatcher: CompletionWatcher
    completer: Completer
    paster: Paster
    wordCounter: WordCounter
    zotero: Zotero
    manager: Manager

    constructor() {
        this.extensionRoot = path.resolve(`${__dirname}/../`)
        const self = vscode.extensions.getExtension('tecosaur.latex-utilities') as vscode.Extension<any>
        this.telemetryReporter = new TelemetryReporter(
            'tecosaur.latex-utilities',
            self.packageJSON.version,
            '11a955d7-02dc-4c1a-85e4-053858f88af0'
        )
        // const workshop = vscode.extensions.getExtension('james-yu.latex-workshop') as vscode.Extension<any>
        // this.workshop = workshop.exports
        // if (workshop.isActive === false) {
        //     workshop.activate().then(() => (this.workshop = workshop.exports))
        // }
        this.logger = new Logger(this)
        this.completionWatcher = new CompletionWatcher(this)
        this.completer = new Completer(this)
        this.paster = new Paster(this)
        this.wordCounter = new WordCounter(this)
        this.zotero = new Zotero(this)
        this.manager = new Manager(this)
    }

    withTelemetry(command: string, callback: () => void) {
        this.logger.addLogMessage(command)
        try {
            callback()
        } catch (error) {
            this.logger.addLogMessage(error)
            this.telemetryReporter.sendTelemetryException(error, {
                command
            })
            this.logger.addLogMessage('Error reported.')
        }
    }
}
