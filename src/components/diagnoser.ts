import * as vscode from 'vscode'
import { Extension } from '../main'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as path from 'path'
import { tmpdir } from 'os'
import { vale } from './linters/vale'
import { LanguageTool } from './linters/languagetool'

export interface IDiagnosticSource {
    command: (fileName: string, extraArguments?: string[]) => string[]
    parser: (
        file: vscode.TextDocument,
        temp_file: string,
        commandOutput: string,
        changes: [vscode.Range,number][]
    ) => void
    codeAction: (document: vscode.TextDocument, range: vscode.Range, source: string, message: string) => void
    diagnostics: vscode.DiagnosticCollection
    actions: Map<vscode.Range, vscode.CodeAction>
    [other: string]: any
    currentProcess?: ChildProcessWithoutNullStreams
}

export class Diagnoser {
    extension: Extension
    diagnosticSources: { [name: string]: IDiagnosticSource } = { vale: vale, LanguageTool: LanguageTool }
    enabledLinters: string[]
    lintersArgs: { [name: string]: string[] }

    private TEMPFOLDER_NAME = 'vscode-latexworkshop'
    private tempfile = ''
    private initalised = false
    private changes: [vscode.Range,number][]=[]

    constructor(extension: Extension) {
        this.extension = extension
        // not calling updateConfig() because that doesn't make tslint happy
        const linterConfig = vscode.workspace.getConfiguration('latex-utilities.linter')
        this.enabledLinters = linterConfig.get('providers') as string[]
        this.lintersArgs = linterConfig.get('arguments') as { [name: string]: string[] }
    }

    private updateConfig() {
        const linterConfig = vscode.workspace.getConfiguration('latex-utilities.linter')
        this.enabledLinters = linterConfig.get('providers') as string[]
        this.lintersArgs = linterConfig.get('arguments') as { [name: string]: string[] }
    }

    public async lintDocument(document: vscode.TextDocument) {
        if (!this.initalised) {
            await this.cleanupTempDir()
            if (!fs.existsSync(path.join(tmpdir(), this.TEMPFOLDER_NAME))) {
                await fs.mkdirSync(path.join(tmpdir(), this.TEMPFOLDER_NAME))
            }
            this.initalised = true
        }
        this.changes=[]
        this.latexToPlaintext(document)

        for (const linterName of this.enabledLinters) {
            console.log(linterName)
            const linter = this.diagnosticSources[linterName]

            const extraArgs = linterName in this.lintersArgs ? this.lintersArgs[linterName] : []
            const command = linter.command(this.tempfile, extraArgs)
            if (linter.currentProcess === undefined) {
                this.extension.logger.addLogMessage(`Running ${linterName} on ${document.fileName}`)
            } else {
                this.extension.logger.addLogMessage(
                    `Refusing to run ${linterName} on ${document.fileName} as this process is already running`
                )
                return
            }
            linter.currentProcess = spawn(command[0], command.slice(1))
            let output = ''
            linter.currentProcess.stdout.on('data', data => {
                output += data
            })
            linter.currentProcess.stdout.on('close', (exitCode: number, _signal: string) => {
                this.extension.logger.addLogMessage(
                    `Running ${linterName} on ${document.fileName} finished with exit code ${exitCode}`
                )
                if (linter.currentProcess !== undefined) {
                    linter.currentProcess.kill()
                }
                linter.currentProcess = undefined
                linter.parser(document, this.tempfile, output,this.changes)
            })
            linter.currentProcess.stdout.on('exit', (exitCode: number, _signal: string) => {
                this.extension.logger.addLogMessage(
                    `Running ${linterName} on ${document.fileName} exited with exit code ${exitCode}`
                )
            })
        }

        this.updateConfig()
    }

    private latexToPlaintext(document: vscode.TextDocument) {
        // Copy
        var str = document.getText()
        
        //
        var list_regex_to_remove  = []
        var list_regex_to_replace = []

        // Remove preamble
        list_regex_to_remove.push(/.*\\\\begin{document}/gs)
        list_regex_to_remove.push(/\\end{document}.*/gs)

        // Remove begin/end environment
        var list_env_to_remove = ["align","align*","equation","equation*","figure","theorem"]

        for (let env of list_env_to_remove){

            // To deal with "*" in input strings
            let regex_str = "\\\\begin\{"+env.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")+"\}.*?\\\\end\{"+env.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")+"\}"
            list_regex_to_remove.push(new RegExp(regex_str,"gs"))
        }

        // Special environments
        list_regex_to_remove.push(/\\\(.*?\\\)/g)
        list_regex_to_remove.push(/\$.*?\$/g)
        
        // Remove command with their argument
        var list_cmd_w_args_to_remove = ["cref","ref","cite"]

        for (let cmd of list_cmd_w_args_to_remove){

            // To deal with "*" in input strings
            let regex_str = "\\\\"+cmd.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")+"\{.*?\}"
            list_regex_to_remove.push(new RegExp(regex_str,"g"))
        }

        // Remove command but keep their argument
        var list_cmd_wo_args_to_remove = ["chapter","section","textbf"]

        for (let cmd of list_cmd_wo_args_to_remove){

            // To deal with "*" in input strings
            let regex_str = "\\\\"+cmd.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")+"\{(.*?)\}"
            list_regex_to_replace.push(new RegExp(regex_str,"g"))
        }

        // Get position of removed content
        for (let i = 0; i < list_regex_to_remove.length; i++) {
            let regex = list_regex_to_remove[i]
            var result

            // Replace by matchAll...
            while ( (result = regex.exec(document.getText())) ) {
                // Save
                this.changes.push([new vscode.Range(document.positionAt(result.index),document.positionAt(regex.lastIndex-1)),1])
                
            }
            str=str.replace(regex,'X')
            
        }

        // Get position of replaced content
        for (let i = 0; i < list_regex_to_replace.length; i++) {
            let regex = list_regex_to_replace[i]
            var result

            // Replace by matchAll...
            while ( (result = regex.exec(document.getText())) ) {
                // Save
                this.changes.push([new vscode.Range(document.positionAt(result.index),document.positionAt(regex.lastIndex-1)),result[1].length])
                console.log(result)
            }
            str=str.replace(regex,"$1")
            
        }

        // Sort by increasing number of lines, and increasing position of the first replaced character
        this.changes.sort((a, b)=>{
            if (a[0].start.line==b[0].start.line)
                return a[0].start.character-b[0].start.character
            else
                return a[0].start.line-b[0].start.line
        })

        // Save temporary file
        this.tempfile = path.join(tmpdir(), this.TEMPFOLDER_NAME, `diagnoser-${path.basename(document.uri.fsPath)}`)
        fs.writeFileSync(this.tempfile, str)
        console.log(this.tempfile)
        

    }
    // private translatePlaintextPosition(linter: IDiagnosticSource) {
    //     linter.actions.forEach(
    //         (value : vscode.CodeAction, key: vscode.Range) => {
    //             console.log(key,value)
    //             for (let key_offset in this.offsets){
    //                 let value = this.offsets[key_offset]
    //             }
    //         }
    //     );

    // }

    public async cleanupTempDir() {
        await fse.removeSync(path.join(tmpdir(), this.TEMPFOLDER_NAME))
    }
}
