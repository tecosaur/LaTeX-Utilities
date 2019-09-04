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

        let options = {
            format: 'biblatex',
            command: configuration.get('latexCommand'),
        }

        try {
            const res = await got(`${zoteroUrl}/better-bibtex/cayw`, {
                query: options,
            })
    
            return res.body
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.extension.logger.showErrorMessage('Could not connect to Zotero. Is it running with the Better BibTeX extension installed?')
            } else {
                this.extension.logger.addLogMessage(`Cannot insert citation: ${error.message}`)
                this.extension.logger.showErrorMessage('Cite as you write failed. Please refer to LaTeX Utilities Output for details.')
            }

            return null
        }
    }

    private search(terms: string): Promise<SearchResult[]> & { cancel(): void } {
        const configuration = vscode.workspace.getConfiguration('latex-utilities.zotero')
        const zoteroUrl = configuration.get('zoteroUrl') as string

        this.extension.logger.addLogMessage(`Searching Zotero for '${terms}'`)
        return got.post(`${zoteroUrl}/better-bibtex/json-rpc`, {
            body: {
                jsonrpc: "2.0",
                method: "item.search",
                params: [terms]
            },
            json: true
        }).then(response => {
            const results = response.body.result as SearchResult[]
            this.extension.logger.addLogMessage(`Got ${results.length} search results from Zotero`)
            return results
        }) as Promise<SearchResult[]> & { cancel(): void }
    }

    // Get a citation from a built-in quick picker
    private async vscodeCite() {
        const disposables: vscode.Disposable[] = [];

        try {
            const entries = await new Promise<SearchResult[]>((resolve, _) => {
                const input = vscode.window.createQuickPick<EntryItem | ErrorItem>();
                input.matchOnDescription = true
                input.matchOnDetail = true
                input.canSelectMany = true
                input.placeholder = 'Type to insert citations'
                
                let req: { cancel(): void } | undefined = undefined

                disposables.push(input.onDidChangeValue(value => {
                    if (value) {
                        input.busy = true

                        if (req) {
                            req.cancel()
                        }

                        // Bit weird, but this holds on to the cancellable promise
                        const search = this.search(value)
                        req = search
                        search.then(results => {
                            input.items = results.map(r => new EntryItem(r))
                        })
                        .catch(error => {
                            input.items = [new ErrorItem(error)]
                        })
                        .finally(() => {
                            input.busy = false
                        })
                    } else {
                        input.items = []
                    }
                }))

                disposables.push(input.onDidAccept(() => {
                    const items = input.selectedItems
                        .filter(i => i instanceof EntryItem)
                        .map(i => (i as EntryItem).result)
                    resolve(items)
                    input.hide
                }))

                disposables.push(input.onDidHide(() => {
                    if (req) {
                        req.cancel()
                    }

                    resolve([])
                    input.dispose()
                }))

                input.show()
            })

            if (entries) {
                const configuration = vscode.workspace.getConfiguration('latex-utilities.zotero')
                const latexCommand = configuration.get('latexCommand') as string

                const keys = entries.map(e => e.citekey).join(',')
                return `\\${latexCommand}{${keys}}`
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
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return
        }

        const citeKey = this.extractCiteKey(editor)
        this.extension.logger.addLogMessage(`Opening ${citeKey} in Zotero`)

        const uri = vscode.Uri.parse(`zotero://select/items/bbt:${citeKey}`)
        await vscode.env.openExternal(uri)
    }
}

// Better BibTeX search result
interface SearchResult {
    type: string;
    citekey: string;
    title: string;
    author?: [{ family: string, given: string }];
    [field: string]: any;
}

class EntryItem implements vscode.QuickPickItem {
    label: string;
    detail: string;
    description: string;

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
    label: string;

    constructor(public message: string) {
        this.label = message.replace(/\r?\n/g, ' ')
    }
}
