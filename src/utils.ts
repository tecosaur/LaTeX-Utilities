import * as vscode from 'vscode'
import { execSync } from 'child_process'

/**
 * Remove the comments if any
 */
export function stripComments(text: string, commentSign: string): string {
    const pattern = '([^\\\\]|^)' + commentSign + '.*$'
    const reg = RegExp(pattern, 'gm')
    return text.replace(reg, '$1')
}

/**
 * @param id document languageId
 */
export function hasTexId(id: string) {
    return id === 'tex' || id === 'latex' || id === 'doctex'
}

export function checkCommandExists(command: string) {
    try {
        execSync(`${command} --version`)
    } catch (error) {
        if (error.status === 127) {
            vscode.window.showErrorMessage(`Command ${command} not found`)
        }
    }
}

/**
 * Find the position of the closing bracket { ... }
 * @param s a string
 * @param startIndex the position of the opening bracket
 */
export function getClosingBracket(s: string, startIndex: number = 0): number {
    let nested = 0
    let nestedSquare = 0
    let i = startIndex
    for (i; i < s.length; i++) {
        switch (s[i]) {
            case '{':
                nested++
                break
            case '}':
                nested--
                break
            case '\\':
                // skip an escaped character
                i++
                break
            default:
        }
        switch (s[i]) {
            case '[':
                nestedSquare++
                break
            case ']':
                nestedSquare--
                break
            case '\\':
                // skip an escaped character
                i++
                break
            default:
        }
        if (nested === 0 && nestedSquare === 0) {
            break
        }
    }
    return i
}
