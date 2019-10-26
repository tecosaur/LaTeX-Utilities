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
    parser: function(document, tempfile, commandOutput,changes) {
        this.diagnostics.clear()
        this.actions.clear()
        const diagnostics: vscode.Diagnostic[] = []
        const result: ILanguageToolJSON[] = JSON.parse(commandOutput)['matches']

        const processDiagnostic = (issue: ILanguageToolJSON) => {
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

            let start_position= new vscode.Position(line, pos);
            let end_position= new vscode.Position(line, pos+issue.length);

            for (let i =0; i<changes.length;i++){
                if (end_position.isBefore(changes[i].start)){
                    break
                }
                else {
                    let lineDelta = changes[i].end.line-changes[i].start.line
                    let characterDelta = 0

                    if (start_position.line+lineDelta==changes[i].end.line && start_position.line>changes[i].start.line){
                        characterDelta=changes[i].end.character+1;
                    }

                    if (start_position.line+lineDelta==changes[i].end.line && start_position.line+lineDelta==changes[i].start.line){
                        characterDelta=changes[i].end.character-changes[i].start.character+1-1; // minus size of dummy 
                    }

                    start_position=start_position.translate(lineDelta,characterDelta);
                    end_position=end_position.translate(lineDelta,characterDelta);         
                }
            
            }
            // Build range of action
            const range = new vscode.Range(start_position,end_position)
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
            processDiagnostic(issue)
        }

        this.diagnostics.set(document.uri, diagnostics)
    }
}
