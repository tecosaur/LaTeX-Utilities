import * as vscode from 'vscode'
import { IDiagnosticSource } from '../diagnoser'

// https://languagetool.org/http-api/swagger-ui/#!/default/post_check
interface ILanguageToolJSON {
    readonly message: string
    readonly shortMessage: string
    readonly offset: number
    readonly length: number
    readonly replacement: {value : string}
    readonly context: {text: string, offset: number, length: number}
    readonly sentence: string
    readonly rule: {id: string, subId: string, description: string, urls: {value: string}, issueType:string, category:{id:string,name:string}}
}

// const ISSUE_MAP: {
//     conditions: { Check?: RegExp; Description?: RegExp; Message?: RegExp }
//     implications: (issue: ILanguageToolJSON) => { tags?: vscode.DiagnosticTag[]; replacement?: string }
// }[] = [
//     {
//         conditions: {
//             Message: /^(?:Consider using|Prefer|Use) '(.+)' (?:instead|over)(?: of)? '(.+)'$/i
//             // catches: TheEconomist.(Terms,Punctuation),
//             // PlainLanguage.(ComplexWords,Contractions,Wordiness,Words)
//             // proselint.(AnimalLabels,Diacritical,GenderBias,GroupTerms,Nonwords)
//             // 18F.(Abbreviations,Brands,Contractions,Terms)
//         },
//         implications: issue => {
//             const match = issue.Message.match(/(?:Consider using|Prefer|Use) '(.+)' (?:instead|over)(?: of)? '(.+)'$/i)
//             if (match) {
//                 let replacement = match[1]
//                 // make capitalisation match
//                 if (match[2][0].toUpperCase() === match[2][0]) {
//                     replacement = replacement[0].toUpperCase() + replacement.slice(1)
//                 }
//                 return { replacement, tags: [vscode.DiagnosticTag.Deprecated] }
//             } else {
//                 return {}
//             }
//         }
//     },
//     {
//         conditions: {
//             Check: /^LanguageTool\.Editorializing|write-good\.(?:So|Illusions)|TheEconomist\.UnnecessaryWords|proselint\.But/
//         },
//         implications: _issue => ({ tags: [vscode.DiagnosticTag.Deprecated], replacement: '' })
//     },
//     {
//         conditions: {
//             Message: /^Avoid using '(.+)'$/i
//             // catches most of Joblint
//         },
//         implications: _issue => ({ tags: [vscode.DiagnosticTag.Unnecessary] })
//     },
//     {
//         conditions: {
//             Check: /^write-good\.Weasel/
//         },
//         implications: _issue => ({ tags: [vscode.DiagnosticTag.Unnecessary] })
//     }
// ]

// function findIssueImplications(issue: ILanguageToolJSON) {
//     for (let i = 0; i < ISSUE_MAP.length; i++) {
//         const item = ISSUE_MAP[i]
//         let meetsConditions = true
//         for (const condition in item.conditions) {
//             // @ts-ignore tslint is stupid, item.conditions[condition] is fine
//             if (!item.conditions[condition].test(issue[condition])) {
//                 meetsConditions = false
//                 break
//             }
//         }
//         if (meetsConditions) {
//             return item.implications(issue)
//         }
//     }
//     return undefined
// }

export const LanguageTool: IDiagnosticSource = {
    command: (fileName: string) => ['languagetool', '--json',fileName],
    actions: new Map(),
    diagnostics: vscode.languages.createDiagnosticCollection('LanguageTool'),
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
        const result: ILanguageToolJSON[] = JSON.parse(commandOutput)['matches']
        const processDiagnostic = (issue: ILanguageToolJSON) => {
            // LanguageTool prints one-based locations but code wants zero-based, so adjust
            // accordingly
            const range = new vscode.Range(document.positionAt(issue.offset), document.positionAt(issue.offset+issue.length))
            const message = issue.message
                // ? `${issue.message} (${issue.Check}, see ${issue.Link})`
                // : `${issue.message} (${issue.Check})`
            let diagnostic = new vscode.Diagnostic(
                range,
                message,
                // {
                //     suggestion: vscode.DiagnosticSeverity.Hint,
                //     warning: vscode.DiagnosticSeverity.Warning,
                //     error: vscode.DiagnosticSeverity.Warning
                // }[issue.Severity]
            )
            diagnostic.source = 'LanguageTool'
            // diagnostic.code = issue.Check
            // diagnostic = this.applyIssueImplications(document, diagnostic, issue)
            diagnostics.push(diagnostic)
        }

        for (const issue of result) {
            processDiagnostic(issue)
        }

        this.diagnostics.set(document.uri, diagnostics)
    },
    // applyIssueImplications: function(
    //     document: vscode.TextDocument,
    //     diagnostic: vscode.Diagnostic,
    //     issue: ILanguageToolJSON
    // ): vscode.Diagnostic {
    //     const implications = findIssueImplications(issue)
    //     if (implications !== undefined) {
    //         if (implications.tags !== undefined) {
    //             diagnostic.tags = implications.tags
    //         }
    //         if (implications.replacement !== undefined) {
    //             const codeAction = new vscode.CodeAction(
    //                 implications.replacement === '' ? 'Remove' : `Replace with '${implications.replacement}'`,
    //                 vscode.CodeActionKind.QuickFix
    //             )
    //             codeAction.command = {
    //                 title: 'Replace value',
    //                 command: 'latex-utilities.code-action',
    //                 arguments: [document, diagnostic.range, diagnostic.source, implications.replacement]
    //             }
    //             codeAction.isPreferred = true
    //             this.actions.set(diagnostic.range, codeAction)
    //         }
    //     }
    //     return diagnostic
    // }
}
