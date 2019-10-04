import * as vscode from 'vscode'
import { IDiagnosticSource } from '../diagnoser'

interface IValeJSON {
    readonly Check: string
    readonly Context: string
    readonly Description: string
    readonly Line: number
    readonly Link: string
    readonly Message: string
    readonly Span: [number, number]
    readonly Severity: 'suggestion' | 'warning' | 'error'
}

const ISSUE_MAP: {
    conditions: { Check?: RegExp; Description?: RegExp; Message?: RegExp }
    implications: (issue: IValeJSON) => { tags?: vscode.DiagnosticTag[]; replacement?: string }
}[] = [
    {
        conditions: {
            Check: /^vale\.Editorializing/
        },
        implications: _issue => ({ tags: [vscode.DiagnosticTag.Deprecated], replacement: '' })
    },
    {
        conditions: {
            Check: /^write-good\.So/
        },
        implications: _issue => ({ tags: [vscode.DiagnosticTag.Deprecated], replacement: '' })
    },
    {
        conditions: {
            Check: /^write-good\.Weasel/
        },
        implications: _issue => ({ tags: [vscode.DiagnosticTag.Unnecessary] })
    },
    {
        conditions: {
            Check: /^write-good\.Illusions/
        },
        implications: _issue => ({ tags: [vscode.DiagnosticTag.Deprecated], replacement: '' })
    },
    {
        conditions: {
            Check: /^TheEconomist\.Terms/
        },
        implications: issue => {
            const match = issue.Message.match(/Prefer '(.+)' over of '(.+)'$/)
            if (match) {
                let replacement = match[1]
                // make capitalisation match
                if (match[2][0].toUpperCase() === match[2][0]) {
                    replacement = replacement[0].toUpperCase() + replacement.slice(1)
                }
                return { replacement, tags: [vscode.DiagnosticTag.Unnecessary] }
            } else {
                return {}
            }
        }
    },
    {
        conditions: {
            Check: /^TheEconomist\.UnnecessaryWords/
        },
        implications: _issue => ({ tags: [vscode.DiagnosticTag.Deprecated], replacement: '' })
    },
    {
        conditions: {
            Check: /^PlainLanguage\.(?:Wordiness|ComplexWords)/
        },
        implications: issue => {
            const match = issue.Message.match(/Consider using '(.+)' instead of '(.+)'$/)
            if (match) {
                return { replacement: match[1] }
            } else {
                return {}
            }
        }
    }
]

function findIssueImplications(issue: IValeJSON) {
    for (let i = 0; i < ISSUE_MAP.length; i++) {
        const item = ISSUE_MAP[i]
        let meetsConditions = true
        for (const condition in item.conditions) {
            // @ts-ignore tslint is stupid, item.conditions[condition] is fine
            if (!item.conditions[condition].test(issue[condition])) {
                meetsConditions = false
                break
            }
        }
        if (meetsConditions) {
            return item.implications(issue)
        }
    }
    return undefined
}

export const vale: IDiagnosticSource = {
    command: (fileName: string) => ['/home/tec/.local/bin/vale', '--no-exit', '--output', 'JSON', fileName],
    actions: new Map(),
    diagnostics: vscode.languages.createDiagnosticCollection('vale'),
    codeAction: (document, range, _code, replacement) => {
        if (!vscode.window.activeTextEditor) {
            return
        }
        vscode.window.activeTextEditor.edit(
            editBuilder => {
                editBuilder.replace(range, replacement)
            },
            { undoStopBefore: true, undoStopAfter: true }
        )
    },
    parser: function(document, commandOutput) {
        this.diagnostics.clear()
        this.actions.clear()

        const diagnostics: vscode.Diagnostic[] = []

        const result: IValeJSON[] = JSON.parse(commandOutput)[document.uri.fsPath]

        const processDiagnostic = (issue: IValeJSON) => {
            // vale prints one-based locations but code wants zero-based, so adjust
            // accordingly
            const range = new vscode.Range(issue.Line - 1, issue.Span[0] - 1, issue.Line - 1, issue.Span[1])
            const message = issue.Link
                ? `${issue.Message} (${issue.Check}, see ${issue.Link})`
                : `${issue.Message} (${issue.Check})`
            let diagnostic = new vscode.Diagnostic(
                range,
                message,
                {
                    suggestion: vscode.DiagnosticSeverity.Hint,
                    warning: vscode.DiagnosticSeverity.Warning,
                    error: vscode.DiagnosticSeverity.Warning
                }[issue.Severity]
            )
            diagnostic.source = 'vale'
            diagnostic.code = issue.Check
            diagnostic = this.applyIssueImplications(document, diagnostic, issue)
            diagnostics.push(diagnostic)
        }

        for (const issue of result) {
            processDiagnostic(issue)
        }

        this.diagnostics.set(document.uri, diagnostics)
    },
    applyIssueImplications: function(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic,
        issue: IValeJSON
    ): vscode.Diagnostic {
        const implications = findIssueImplications(issue)
        if (implications !== undefined) {
            if (implications.tags !== undefined) {
                diagnostic.tags = implications.tags
            }
            if (implications.replacement !== undefined) {
                const codeAction = new vscode.CodeAction(
                    implications.replacement === '' ? 'Remove' : `Replace with '${implications.replacement}'`,
                    vscode.CodeActionKind.QuickFix
                )
                codeAction.command = {
                    title: 'Replace value',
                    command: 'latex-utilities.code-action',
                    arguments: [document, diagnostic.range, diagnostic.source, implications.replacement]
                }
                codeAction.isPreferred = true
                this.actions.set(diagnostic.range, codeAction)
            }
        }
        return diagnostic
    }
}
