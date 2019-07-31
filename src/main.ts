import * as vscode from 'vscode'
import * as path from 'path'

import { Logger } from './components/logger'
import { CompletionWatcher, Completer } from './components/completionWatcher'
import { Paster as ImagePaster } from './components/imagePaster'
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
        vscode.commands.registerCommand('latex-utilities.pasteImage', () => extension.imagePaster.pasteImage()),
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

    const api = {
        pasteImage: (imgFile?: string) => extension.imagePaster.pasteImage(imgFile)
    }

    return api
}

export function deactivate() {}

export class Extension {
    extensionRoot: string
    workshop: vscode.Extension<any>
    logger: Logger
    completionWatcher: CompletionWatcher
    completer: Completer
    imagePaster: ImagePaster
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
        this.imagePaster = new ImagePaster(this)
        this.wordCounter = new WordCounter(this)
    }
}
