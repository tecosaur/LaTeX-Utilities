import * as vscode from 'vscode'
import { IDiagnosticSource } from '../diagnoser'
import { fsync } from 'fs-extra'
import * as fs from 'fs'

// https://languagetool.org/http-api/swagger-ui/#!/default/post_check
interface ILanguageToolJSON {
    readonly message: string
    readonly shortMessage: string
    readonly offset: number
    readonly length: number
    readonly replacements: { value: string }[]
    // readonly context: {text: string, offset: number, length: number}
    // readonly sentence: string
    // readonly rule: {id: string, subId: string, description: string, urls: {value: string}, issueType:string, category:{id:string,name:string}}
}

export const LanguageTool: IDiagnosticSource = {
    command: (fileName: string, extraArguments: string[] = []) => [
        'languagetool',
        '--json',
        ...extraArguments,
        fileName
    ],
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
    parser: function(document, tempfile, commandOutput,offsets) {
        this.diagnostics.clear()
        this.actions.clear()

        const diagnostics: vscode.Diagnostic[] = []
        const result: ILanguageToolJSON[] = JSON.parse(commandOutput)['matches']
        console.log(result)
        const processDiagnostic = (issue: ILanguageToolJSON, offsets: [number,number,  number , number][]) => {
            // Read temporary file
            let temp_text= fs.readFileSync(tempfile)

            // Translate offsets position from ILanguageToolJSON to (line,offset)
            let line =(temp_text.toString().substr(0,issue.offset).match(/\n/g) || []).length;  

            let first_char_pos=temp_text.toString().substr(0,issue.offset).lastIndexOf('\n');
            if (first_char_pos==-1){
                first_char_pos=0;
            }
            else {
                first_char_pos+=1;
            }

            let pos=issue.offset-first_char_pos;
            console.log(issue.offset,first_char_pos,pos)
            // Apply change of coordinates
            console.log(offsets)
            for (let i =0; i<offsets.length;i++){
                if (line<offsets[i][0])
                    break 
                else {
                    if (line>offsets[i][0]){
                        line+=offsets[i][1]
                    }
                    if (line==offsets[i][0]){
                        console.log(offsets[i][3]-1,pos,offsets[i][2])
                        if (pos>offsets[i][2]){
                            pos=pos+offsets[i][3]-1 // -size of dummy replacement more exactly
                            console.log(offsets[i][3]-1)

                        }
                    }
                }

            }
console.log(line,pos,line,pos+issue.length)
            // Build range of action
            const range = new vscode.Range(line,pos,line,pos+issue.length)
            const message = issue.message

            let diagnostic = new vscode.Diagnostic(
                range,
                message
                // {
                //     suggestion: vscode.DiagnosticSeverity.Hint,
                //     warning: vscode.DiagnosticSeverity.Warning,
                //     error: vscode.DiagnosticSeverity.Warning
                // }[issue.Severity]
            )
            diagnostic.source = 'LanguageTool'
            // diagnostic.code = issue.Check

            if (Object.keys(issue.replacements).length !== 0) {
                for (const replacement of issue.replacements) {
                    const codeAction = new vscode.CodeAction(
                        `Replace with '${replacement.value}'`,
                        vscode.CodeActionKind.QuickFix
                    )
                    codeAction.command = {
                        title: 'Replace value',
                        command: 'latex-utilities.code-action',
                        arguments: [document, diagnostic.range, diagnostic.source, replacement.value]
                    }
                    this.actions.set(diagnostic.range, codeAction)
                }
            }

            diagnostics.push(diagnostic)
        }

        for (const issue of result) {
            processDiagnostic(issue,offsets)
        }

        this.diagnostics.set(document.uri, diagnostics)
    }
}
