import * as vscode from 'vscode'
import * as path from 'path'

import { Logger } from './components/logger'
import { CompletionWatcher, Completer } from './components/completionWatcher'
import { Paster } from './components/paster'
import { WordCounter } from './components/wordCounter'
import { TikzCodeLense } from './providers/tikzcodelense'
import { MacroDefinitions } from './providers/macroDefinitions'
import { TikzPictureView } from './components/tikzpreview'
import { Zotero } from './components/zotero'
import { Diagnoser } from './components/diagnoser'
import { CodeActions } from './providers/codeActions'
import * as utils from './utils'

export function activate(context: vscode.ExtensionContext) {
    const extension = new Extension()

    extension.logger.addLogMessage('LaTeX Utilities Started')

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-utilities.editLiveSnippetsFile', () =>
            extension.completionWatcher.editSnippetsFile()
        ),
        vscode.commands.registerCommand('latex-utilities.formattedPaste', () => extension.paster.paste()),
        vscode.commands.registerCommand('latex-utilities.countWord', () => extension.wordCounter.count()),
        vscode.commands.registerCommand('latex-utilities.viewtikzpicture', (document, range) =>
            extension.tikzPreview.view(document, range)
        ),
        vscode.commands.registerCommand('latex-utilities.citeZotero', () => extension.zotero.cite()),
        vscode.commands.registerCommand('latex-utilities.openInZotero', () => extension.zotero.openCitation()),
        vscode.commands.registerCommand('latex-utilities.selectWordcountFormat', () =>
            extension.wordCounter.pickFormat()
        ),
        vscode.commands.registerCommand('latex-utilities.code-action', (d, r, c, m) =>
            extension.codeActions.runCodeAction(d, r, c, m)
        )
    )

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(
            (e: vscode.TextDocumentChangeEvent) => {
                if (utils.hasTexId(e.document.languageId)) {
                    extension.completionWatcher.watcher(e)
                    extension.tikzPreview.onFileChange(e.document, e.contentChanges)
                }
            },
            undefined,
            [new vscode.Disposable(extension.tikzPreview.cleanupTempFiles)]
        ),
        vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
            if (e.uri.fsPath === extension.completionWatcher.snippetFile.user) {
                extension.completionWatcher.loadSnippets(true)
                return
            }
            extension.wordCounter.setStatus()
            if (utils.hasTexId(e.languageId)) {
                extension.diagnoser.lintDocument(e)
            }
        }),
        vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
            extension.wordCounter.setStatus()
        })
    )

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex' }, extension.completer),
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'latex' }, extension.completer),
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'doctex' }, extension.completer),
        vscode.languages.registerCodeLensProvider({ language: 'latex', scheme: 'file' }, new TikzCodeLense()),
        vscode.languages.registerDefinitionProvider(
            { language: 'latex', scheme: 'file' },
            new MacroDefinitions(extension)
        ),
        vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'latex' }, extension.codeActions)
    )
}

export function deactivate() {}

export class Extension {
    extensionRoot: string
    // @ts-ignore
    workshop: LaTeXWorkshopAPI
    logger: Logger
    completionWatcher: CompletionWatcher
    completer: Completer
    paster: Paster
    wordCounter: WordCounter
    tikzPreview: TikzPictureView
    zotero: Zotero
    diagnoser: Diagnoser
    codeActions: CodeActions

    constructor() {
        this.extensionRoot = path.resolve(`${__dirname}/../../`)
        const workshop = vscode.extensions.getExtension('james-yu.latex-workshop')
        if (workshop === undefined) {
            throw new Error('LaTeX Workshop required, not found')
        } else {
            if (workshop.isActive === false) {
                workshop.activate().then(() => (this.workshop = workshop.exports))
            } else {
                this.workshop = workshop.exports
            }
        }
        this.logger = new Logger(this)
        this.completionWatcher = new CompletionWatcher(this)
        this.completer = new Completer(this)
        this.paster = new Paster(this)
        this.wordCounter = new WordCounter(this)
        this.tikzPreview = new TikzPictureView(this)
        this.zotero = new Zotero(this)
        this.diagnoser = new Diagnoser(this)
        this.codeActions = new CodeActions(this)
    }
}

interface LaTeXWorkshopAPI {
    getRootFile: () => string
    getGraphicsPath: () => string[]
    viewer: {
        clients: {
            [key: string]: {
                viewer: 'browser' | 'tab'
                websocket: unknown
                position?: {}
            }[]
        }
        refreshExistingViewer(sourceFile?: string, viewer?: string): boolean
        openTab(sourceFile: string, respectOutDir: boolean, sideColumn: boolean): void
    }
    manager: {
        setEnvVar: () => void
        findRoot: () => Promise<string | undefined>
        rootDir: () => string
        rootFile: () => string
    }
    completer: {
        command: {
            usedPackages: () => string[]
        }
    }
}
