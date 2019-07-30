import * as vscode from 'vscode'
import * as path from 'path'

import { Logger } from './components/logger'
import { CompletionWatcher, Completer } from './components/completionWatcher'

export function activate(context: vscode.ExtensionContext) {
    const extension = new Extension()

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-workshop.editLiveSnippetsFile', () =>
            extension.completionWatcher.editSnippetsFile()
        )
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
    logger: Logger
    completionWatcher: CompletionWatcher
    completer: Completer

    constructor() {
        this.extensionRoot = path.resolve(`${__dirname}/../../`)
        this.logger = new Logger(this)
        this.completionWatcher = new CompletionWatcher(this)
        this.completer = new Completer(this)
    }
}
