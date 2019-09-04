import * as vscode from 'vscode'
import * as got from 'got'

import { Extension } from '../main'

export class Zotero {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    async cite() {
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

            const citation = res.body

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
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.extension.logger.showErrorMessage('Could not connect to Zotero. Is it running with the Better BibTeX extension installed?')
            } else {
                this.extension.logger.addLogMessage(`Cannot insert citation: ${error.message}`)
                this.extension.logger.showErrorMessage('Cite as you write failed. Please refer to LaTeX Utilities Output for details.')
            }
        }
    }

    extractCiteKey(editor: vscode.TextEditor) {
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