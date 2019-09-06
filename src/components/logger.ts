import * as vscode from 'vscode'

import { Extension } from '../main'

export class Logger {
    extension: Extension
    logPanel: vscode.OutputChannel

    constructor(extension: Extension) {
        this.extension = extension
        this.logPanel = vscode.window.createOutputChannel('LaTeX Utilities')
        this.addLogMessage('Initializing LaTeX Utilities.')
    }

    addLogMessage(message: string) {
        this.logPanel.append(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${message}\n`)
    }

    showErrorMessage(message: string, ...args: any): Thenable<any> | undefined {
        const configuration = vscode.workspace.getConfiguration('latex-utilities')
        if (configuration.get('message.error.show')) {
            return vscode.window.showErrorMessage(message, ...args)
        } else {
            return undefined
        }
    }

    showLog() {
        this.logPanel.show()
    }
}
