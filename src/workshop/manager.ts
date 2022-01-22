// from James-Yu/LaTeX-Workshop

import { Extension } from '../main'
import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as utils from './utils'
import * as tmp from 'tmp'
import {FinderUtils} from './finderutils'
import type {MatchPath} from './pathutils'
import {PathUtils, PathRegExp} from './pathutils'


/**
 * The content cache for each LaTeX file `filepath`.
 */
 interface Content {
    [filepath: string]: { // The path of a LaTeX file.
        /**
         * The dirty (under editing) content of the LaTeX file if opened in vscode,
         * the content on disk otherwise.
         */
        content: string | undefined
        /**
         * The sub-files of the LaTeX file. They should be tex or plain files.
         */
        children: {
            /**
             * The index of character sub-content is inserted
             */
            index: number
            /**
             * The path of the sub-file
             */
            file: string
        }[]
        /**
         * The array of the paths of `.bib` files referenced from the LaTeX file.
         */
        bibs: string[]
    }
}


type RootFileType = {
    type: 'filePath'
    filePath: string
} | {
    type: 'uri'
    uri: vscode.Uri
}

export class Manager {
    /**
     * The content cache for each LaTeX file.
     */
    private readonly cachedContent = Object.create(null) as Content

    private readonly localRootFiles = Object.create(null) as { [key: string]: string | undefined }
    private readonly rootFilesLanguageIds = Object.create(null) as { [key: string]: string | undefined }
    // Store one root file for each workspace.
    private readonly rootFiles = Object.create(null) as { [key: string]: RootFileType | undefined }
    private workspaceRootDirUri: string = ''

    private readonly extension: Extension
    private readonly rsweaveExt: string[] = ['.rnw', '.Rnw', '.rtex', '.Rtex', '.snw', '.Snw']
    private readonly jlweaveExt: string[] = ['.jnw', '.jtexw']
    private readonly weaveExt: string[] = []
    private readonly finderUtils: FinderUtils
    private readonly pathUtils: PathUtils
    private tmpDir: string

    constructor(extension: Extension) {
        this.extension = extension
        this.finderUtils = new FinderUtils(extension)
        this.pathUtils = new PathUtils(extension)
        this.tmpDir = tmp.dirSync({unsafeCleanup: true}).name.split(path.sep).join('/')
    }

    /**
     * Returns the output directory developed according to the input tex path
     * and 'latex.outDir' config. If `texPath` is `undefined`, the default root
     * file is used. If there is not root file, returns './'.
     * The returned path always uses `/` even on Windows.
     *
     * @param texPath The path of a LaTeX file.
     */
     getOutDir(texPath?: string) {
        if (texPath === undefined) {
            texPath = this.rootFile
        }
        // rootFile is also undefined
        if (texPath === undefined) {
            return './'
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const outDir = configuration.get('latex.outDir') as string
        const out = utils.replaceArgumentPlaceholders(texPath, this.tmpDir)(outDir)
        return path.normalize(out).split(path.sep).join('/')
    }


    /**
     * The path of the directory of the root file.
     */
    get rootDir() {
        return this.rootFile ? path.dirname(this.rootFile) : undefined
    }

    /**
     * The path of the root LaTeX file of the current workspace.
     * It is `undefined` before `findRoot` called.
     */
    get rootFile(): string | undefined {
        const ret = this.rootFiles[this.workspaceRootDirUri]
        if (ret) {
            if (ret.type === 'filePath') {
                return ret.filePath
            } else {
                if (ret.uri.scheme === 'file') {
                    return ret.uri.fsPath
                } else {
                    this.extension.logger.addLogMessage(`The file cannot be used as the root file: ${ret.uri.toString(true)}`)
                    return
                }
            }
        } else {
            return
        }
    }

    set rootFile(root: string | undefined) {
        if (root) {
            this.rootFiles[this.workspaceRootDirUri] = { type: 'filePath', filePath: root }
        } else {
            this.rootFiles[this.workspaceRootDirUri] = undefined
        }
    }

    get rootFileUri(): vscode.Uri | undefined {
        const root = this.rootFiles[this.workspaceRootDirUri]
        if (root) {
            if (root.type === 'filePath') {
                return vscode.Uri.file(root.filePath)
            } else {
                return root.uri
            }
        } else {
            return
        }
    }

    set rootFileUri(root: vscode.Uri | undefined) {
        let rootFile: RootFileType | undefined
        if (root) {
            if (root.scheme === 'file') {
                rootFile = { type: 'filePath', filePath: root.fsPath }
            } else {
                rootFile = { type: 'uri', uri: root }
            }
        }
        this.rootFiles[this.workspaceRootDirUri] = rootFile
    }

    get localRootFile() {
        return this.localRootFiles[this.workspaceRootDirUri]
    }

    set localRootFile(localRoot: string | undefined) {
        this.localRootFiles[this.workspaceRootDirUri] = localRoot
    }

    get rootFileLanguageId() {
        return this.rootFilesLanguageIds[this.workspaceRootDirUri]
    }

    set rootFileLanguageId(id: string | undefined) {
        this.rootFilesLanguageIds[this.workspaceRootDirUri] = id
    }

    private inferLanguageId(filename: string): string | undefined {
        const ext = path.extname(filename).toLocaleLowerCase()
        if (ext === '.tex') {
            return 'latex'
        } else if (this.jlweaveExt.includes(ext)) {
            return 'jlweave'
        } else if (this.rsweaveExt.includes(ext)) {
            return 'rsweave'
        } else {
            return undefined
        }
    }

    /**
     * Returns `true` if the language of `id` is one of supported languages.
     *
     * @param id The identifier of language.
     */
    hasTexId(id: string) {
        return ['tex', 'latex', 'latex-expl3', 'doctex', 'jlweave', 'rsweave'].includes(id)
    }

    private findWorkspace() {
        const firstDir = vscode.workspace.workspaceFolders?.[0]
        // If no workspace is opened.
        if (!firstDir) {
            this.workspaceRootDirUri = ''
            return
        }
        // If we don't have an active text editor, we can only make a guess.
        // Let's guess the first one.
        if (!vscode.window.activeTextEditor) {
            this.workspaceRootDirUri = firstDir.uri.toString(true)
            return
        }
        // Get the workspace folder which contains the active document.
        const activeFileUri = vscode.window.activeTextEditor.document.uri
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeFileUri)
        if (workspaceFolder) {
            this.workspaceRootDirUri = workspaceFolder.uri.toString(true)
            return
        }
        // Guess that the first workspace is the chosen one.
        this.workspaceRootDirUri = firstDir.uri.toString(true)
    }

    /**
     * Finds the root file with respect to the current workspace and returns it.
     * The found root is also set to `rootFile`.
     */
    async findRoot(): Promise<string | undefined> {
        this.findWorkspace()
        const wsfolders = vscode.workspace.workspaceFolders?.map(e => e.uri.toString(true))
        this.extension.logger.addLogMessage(`Current workspace folders: ${JSON.stringify(wsfolders)}`)
        this.extension.logger.addLogMessage(`Current workspaceRootDir: ${this.workspaceRootDirUri}`)
        this.localRootFile = undefined
        const findMethods = [
            () => {
                if (!vscode.window.activeTextEditor) {
                    return undefined
                }
                const regex = /^(?:%\s*!\s*T[Ee]X\sroot\s*=\s*(.*\.(?:tex|[jrsRS]nw|[rR]tex|jtexw))$)/m
                let content: string | undefined = vscode.window.activeTextEditor.document.getText()

                let result = content.match(regex)
                const fileStack: string[] = []
                if (result) {
                    let file = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
                    content = fs.readFileSync(file).toString()
                    if (content === undefined) {
                        const msg = `Not found root file specified in the magic comment: ${file}`
                        this.extension.logger.addLogMessage(msg)
                        throw new Error(msg)
                    }
                    fileStack.push(file)
                    this.extension.logger.addLogMessage(`Found root file by magic comment: ${file}`)

                    result = content.match(regex)
                    while (result) {
                        file = path.resolve(path.dirname(file), result[1])
                        if (fileStack.includes(file)) {
                            this.extension.logger.addLogMessage(`Looped root file by magic comment found: ${file}, stop here.`)
                            return file
                        } else {
                            fileStack.push(file)
                            this.extension.logger.addLogMessage(`Recursively found root file by magic comment: ${file}`)
                        }

                        content = fs.readFileSync(file).toString()
                        if (content === undefined) {
                            const msg = `Not found root file specified in the magic comment: ${file}`
                            this.extension.logger.addLogMessage(msg)
                            throw new Error(msg)

                        }
                        result = content.match(regex)
                    }
                    return file
                }
                return undefined
            },
            () => this.findRootFromActive(),
            () => this.findRootInWorkspace()
        ]
        for (const method of findMethods) {
            const rootFile = await method()
            if (rootFile === undefined) {
                continue
            }
            if (this.rootFile !== rootFile) {
                this.extension.logger.addLogMessage(`Root file changed: from ${this.rootFile} to ${rootFile}`)
                this.extension.logger.addLogMessage('Start to find all dependencies.')
                this.rootFile = rootFile
                this.rootFileLanguageId = this.inferLanguageId(rootFile)
                this.extension.logger.addLogMessage(`Root file languageId: ${this.rootFileLanguageId}`)
            } else {
                this.extension.logger.addLogMessage(`Keep using the same root file: ${this.rootFile}`)
            }
            return rootFile
        }
        return undefined
    }

    private findRootFromActive(): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        if (vscode.window.activeTextEditor.document.uri.scheme !== 'file') {
            this.extension.logger.addLogMessage(`The active document cannot be used as the root file: ${vscode.window.activeTextEditor.document.uri.toString(true)}`)
            return undefined
        }
        const regex = /\\begin{document}/m
        const content = utils.stripCommentsAndVerbatim(vscode.window.activeTextEditor.document.getText())
        const result = content.match(regex)
        if (result) {
            const rootSubFile = this.finderUtils.findSubFiles(content)
            const file = vscode.window.activeTextEditor.document.fileName
            if (rootSubFile) {
               this.localRootFile = file
               return rootSubFile
            } else {
                this.extension.logger.addLogMessage(`Found root file from active editor: ${file}`)
                return file
            }
        }
        return undefined
    }

    private async findRootInWorkspace(): Promise<string | undefined> {
        const regex = /\\begin{document}/m

        if (!this.workspaceRootDirUri) {
            return undefined
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const rootFilesIncludePatterns = configuration.get('latex.search.rootFiles.include') as string[]
        const rootFilesIncludeGlob = '{' + rootFilesIncludePatterns.join(',') + '}'
        const rootFilesExcludePatterns = configuration.get('latex.search.rootFiles.exclude') as string[]
        const rootFilesExcludeGlob = rootFilesExcludePatterns.length > 0 ? '{' + rootFilesExcludePatterns.join(',') + '}' : undefined
        try {
            const files = await vscode.workspace.findFiles(rootFilesIncludeGlob, rootFilesExcludeGlob)
            const candidates: string[] = []
            for (const file of files) {
                if (file.scheme !== 'file') {
                    this.extension.logger.addLogMessage(`Skip the file: ${file.toString(true)}`)
                    continue
                }
                const flsChildren = this.getTeXChildrenFromFls(file.fsPath)
                if (vscode.window.activeTextEditor && flsChildren.includes(vscode.window.activeTextEditor.document.fileName)) {
                    this.extension.logger.addLogMessage(`Found root file from '.fls': ${file.fsPath}`)
                    return file.fsPath
                }
                const content = utils.stripCommentsAndVerbatim(fs.readFileSync(file.fsPath).toString())
                const result = content.match(regex)
                if (result) {
                    // Can be a root
                    const children = this.getTeXChildren(file.fsPath, file.fsPath, [], content)
                    if (vscode.window.activeTextEditor && children.includes(vscode.window.activeTextEditor.document.fileName)) {
                        this.extension.logger.addLogMessage(`Found root file from parent: ${file.fsPath}`)
                        return file.fsPath
                    }
                    // Not including the active file, yet can still be a root candidate
                    candidates.push(file.fsPath)
                }
            }
            if (candidates.length > 0) {
                this.extension.logger.addLogMessage(`Found files that might be root, choose the first one: ${candidates}`)
                return candidates[0]
            }
        } catch (e) {}
        return undefined
    }

    private getTeXChildrenFromFls(texFile: string) {
        const flsFile = this.pathUtils.getFlsFilePath(texFile)
        if (flsFile === undefined) {
            return []
        }
        const rootDir = path.dirname(texFile)
        const ioFiles = this.pathUtils.parseFlsContent(fs.readFileSync(flsFile).toString(), rootDir)
        return ioFiles.input
    }

    /**
     * Return the list of files (recursively) included in `file`
     *
     * @param file The file in which children are recursively computed
     * @param baseFile The file currently considered as the rootFile
     * @param children The list of already computed children
     * @param content The content of `file`. If undefined, it is read from disk
     */
     private getTeXChildren(file: string, baseFile: string, children: string[], content?: string): string[] {
        if (content === undefined) {
            content = utils.stripCommentsAndVerbatim(fs.readFileSync(file).toString())
        }

        // Update children of current file
        if (this.cachedContent[file] === undefined) {
            this.cachedContent[file] = {content, bibs: [], children: []}
            const pathRegexp = new PathRegExp()
            while (true) {
                const result: MatchPath | undefined = pathRegexp.exec(content)
                if (!result) {
                    break
                }

                const inputFile = pathRegexp.parseInputFilePath(result, file, baseFile)

                if (!inputFile ||
                    !fs.existsSync(inputFile) ||
                    path.relative(inputFile, baseFile) === '') {
                    continue
                }

                this.cachedContent[file].children.push({
                    index: result.index,
                    file: inputFile
                })
            }
        }

        this.cachedContent[file].children.forEach(child => {
            if (children.includes(child.file)) {
                // Already included
                return
            }
            children.push(child.file)
            this.getTeXChildren(child.file, baseFile, children)
        })
        return children
    }
}

