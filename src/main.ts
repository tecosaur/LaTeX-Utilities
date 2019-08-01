import * as vscode from 'vscode'
import * as path from 'path'

import { Logger } from './components/logger'
import { CompletionWatcher, Completer } from './components/completionWatcher'
import { Paster } from './components/paster'
import { WordCounter } from './components/wordCounter'

export function activate(context: vscode.ExtensionContext) {
    const extension = new Extension()

    if (extension.workshop === undefined) {
        throw new Error('LaTeX Workshop required, not found')
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-utilities.editLiveSnippetsFile', () =>
            extension.completionWatcher.editSnippetsFile()
        ),
        vscode.commands.registerCommand('latex-utilities.formattedPaste', () => extension.paster.paste()),
        vscode.commands.registerCommand('latex-utilities.countWord', () => extension.wordCounter.count())
    )

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) =>
            extension.completionWatcher.watcher(e)
        ),
        vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
            if (e.uri.fsPath === extension.completionWatcher.snippetFile.user) {
                extension.completionWatcher.loadSnippets(true)
            }
        })
    )

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex' }, extension.completer),
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'latex' }, extension.completer),
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'doctex' }, extension.completer)
    )
}

export function deactivate() {}

export class Extension {
    extensionRoot: string
    workshop: vscode.Extension<LaTeXWorkshopAPI>
    logger: Logger
    completionWatcher: CompletionWatcher
    completer: Completer
    paster: Paster
    wordCounter: WordCounter

    constructor() {
        this.extensionRoot = path.resolve(`${__dirname}/../../`)
        // @ts-ignore
        this.workshop = vscode.extensions.getExtension('james-yu.latex-workshop')
        if (this.workshop !== undefined && this.workshop.isActive === false) {
            this.workshop.activate()
        }
        this.logger = new Logger(this)
        this.completionWatcher = new CompletionWatcher(this)
        this.completer = new Completer(this)
        this.paster = new Paster(this)
        this.wordCounter = new WordCounter(this)
    }
}

interface LaTeXWorkshopAPI {
    getRootFile: () => string
    getGraphicsPath: () => string[]
    setEnvVar: () => void
}
