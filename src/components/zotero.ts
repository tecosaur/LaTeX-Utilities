import * as vscode from 'vscode'
import * as got from 'got'

import { Extension } from '../main'

export class Zotero {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    // Get a citation via the Zotero Cite as you Write popup
    private async caywCite() {
        const configuration = vscode.workspace.getConfiguration('latex-utilities.zotero')

        const zoteroUrl = configuration.get('zoteroUrl') as string

        const options = {
            format: 'biblatex',
            command: configuration.get('latexCommand')
        }

        try {
            const res = await got(`${zoteroUrl}/better-bibtex/cayw`, {
                query: options
            })

            return res.body
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.extension.logger.showErrorMessage(
                    'Could not connect to Zotero. Is it running with the Better BibTeX extension installed?'
                )
            } else {
                this.extension.logger.addLogMessage(`Cannot insert citation: ${error.message}`)
                this.extension.logger.showErrorMessage(
                    'Cite as you write failed. Please refer to LaTeX Utilities Output for details.'
                )
            }

            return null
        }
    }

    // Search the Zotero library for entries matching `terms`.
    // Returns a promise for search results and a function to cancel the search
    private search(terms: string): [Promise<SearchResult[]>, () => void] {
        const configuration = vscode.workspace.getConfiguration('latex-utilities.zotero')
        const zoteroUrl = configuration.get('zoteroUrl') as string

        this.extension.logger.addLogMessage(`Searching Zotero for "${terms}"`)
        const req = got.post(`${zoteroUrl}/better-bibtex/json-rpc`, {
            body: {
                jsonrpc: '2.0',
                method: 'item.search',
                params: [terms]
            },
            json: true
        })

        return [
            req.then(response => {
                const results = response.body.result as SearchResult[]
                this.extension.logger.addLogMessage(`Got ${results.length} search results from Zotero for "${terms}"`)
                return results
            }),
            req.cancel.bind(req)
        ]
    }

    // Get a citation from a built-in quick picker
    private async vscodeCite() {
        const disposables: vscode.Disposable[] = []

        try {
            const entries = await new Promise<SearchResult[]>((resolve, _) => {
                const input = vscode.window.createQuickPick<EntryItem | ErrorItem>()
                input.matchOnDescription = true
                input.matchOnDetail = true
                input.canSelectMany = true
                input.placeholder = 'Type to insert citations'

                let cancel: (() => void) | undefined

                disposables.push(
                    input.onDidChangeValue(value => {
                        if (value) {
                            input.busy = true

                            if (cancel) {
                                cancel()
                                cancel = undefined
                            }

                            const [r, c] = this.search(value)
                            cancel = c
                            r.then(results => {
                                input.items = results.map(result => new EntryItem(result))
                            })
                                .catch(error => {
                                    if (!error.isCanceled) {
                                        if (error.code === 'ECONNREFUSED') {
                                            this.extension.logger.showErrorMessage(
                                                'Could not connect to Zotero. Is it running with the Better BibTeX extension installed?'
                                            )
                                        } else {
                                            this.extension.logger.addLogMessage(
                                                `Searching Zotero failed: ${error.message}`
                                            )
                                            input.items = [new ErrorItem(error)]
                                        }
                                    }
                                })
                                .finally(() => {
                                    input.busy = false
                                })
                        } else {
                            input.items = []
                        }
                    })
                )

                disposables.push(
                    input.onDidAccept(() => {
                        const items = input.selectedItems.length > 0 ? input.selectedItems : input.activeItems
                        input.hide()
                        resolve(items.filter(i => i instanceof EntryItem).map(i => (i as EntryItem).result))
                    })
                )

                disposables.push(
                    input.onDidHide(() => {
                        if (cancel) {
                            cancel()
                        }

                        resolve([])
                        input.dispose()
                    })
                )

                input.show()
            })

            if (entries && entries.length > 0) {
                const configuration = vscode.workspace.getConfiguration('latex-utilities.zotero')
                const latexCommand = configuration.get('latexCommand') as string

                const keys = entries.map(e => e.citekey).join(',')
                return latexCommand.length > 0 ?`\\${latexCommand}{${keys}}` : `${keys}`
            } else {
                return null
            }
        } finally {
            disposables.forEach(d => d.dispose())
        }
    }

    private async insertCitation(citation: string) {
        const editor = vscode.window.activeTextEditor
        if (editor) {
            await editor.edit(edit => {
                if (editor.selection.isEmpty) {
                    edit.insert(editor.selection.active, citation)
                } else {
                    edit.delete(editor.selection)
                    edit.insert(editor.selection.start, citation)
                }
            })

            this.extension.logger.addLogMessage(`Added citation: ${citation}`)
        } else {
            this.extension.logger.addLogMessage('Could not insert citation: no active text editor')
        }
    }

    async cite() {
        const configuration = vscode.workspace.getConfiguration('latex-utilities.zotero')
        const citeMethod = configuration.get('citeMethod')

        if (!(await this.checkZotero())) {
            return
        }

        let citation = null
        if (citeMethod === 'zotero') {
            citation = await this.caywCite()
        } else if (citeMethod === 'vscode') {
            citation = await this.vscodeCite()
        } else {
            this.extension.logger.showErrorMessage(`Unknown cite method: ${citeMethod}`)
        }

        if (citation) {
            this.insertCitation(citation)
        }

        this.extension.telemetryReporter.sendTelemetryEvent('zoteroCite')
    }

    private extractCiteKey(editor: vscode.TextEditor) {
        if (editor.selection.isEmpty) {
            const range = editor.document.getWordRangeAtPosition(editor.selection.active)
            return editor.document.getText(range)
        } else {
            return editor.document.getText(new vscode.Range(editor.selection.start, editor.selection.end))
        }
    }

    async openCitation() {
        if (!(await this.checkZotero())) {
            return
        }

        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return
        }

        const citeKey = this.extractCiteKey(editor)
        this.extension.logger.addLogMessage(`Opening ${citeKey} in Zotero`)

        const uri = vscode.Uri.parse(`zotero://select/items/bbt:${citeKey}`)
        await vscode.env.openExternal(uri)
    }

    private async checkZotero() {
        const configuration = vscode.workspace.getConfiguration('latex-utilities.zotero')
        const zoteroUrl = configuration.get('zoteroUrl') as string

        try {
            await got.get(`${zoteroUrl}/connector/ping`)
            return true
        } catch (e) {
            if (e.code === 'ECONNREFUSED') {
                vscode.window.showWarningMessage("Zotero doesn't appear to be running.")
                return false
            }
        }
        return false
    }
}

// Better BibTeX search result
interface SearchResult {
    type: string
    citekey: string
    title: string
    author?: [{ family: string, given: string }]
    [field: string]: any
}

class EntryItem implements vscode.QuickPickItem {
    label: string
    detail: string
    description: string

    constructor(public result: SearchResult) {
        this.label = result.title
        this.detail = result.citekey

        if (result.author) {
            const names = result.author.map(a => `${a.given} ${a.family}`)

            if (names.length < 2) {
                this.description = names.join(' ')
            } else if (names.length === 2) {
                this.description = names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
            } else {
                this.description = names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1]
            }
        } else {
            this.description = ''
        }
    }
}

class ErrorItem implements vscode.QuickPickItem {
    label: string

    constructor(public message: string) {
        this.label = message.replace(/\r?\n/g, ' ')
    }
}
