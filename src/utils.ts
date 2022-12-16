import * as vscode from 'vscode';
import { execSync } from 'child_process';

/**
 * Remove the comments if any
 */
export function stripComments(text: string, commentSign: string): string {
    const pattern = '([^\\\\]|^)' + commentSign + '.*$';
    const reg = RegExp(pattern, 'gm');
    return text.replace(reg, '$1');
}

/**
 * @param id document languageId
 */
export function hasTexId(id: string) {
    return id === 'tex' || id === 'latex' || id === 'doctex';
}

export function checkCommandExists(command: string) {
    try {
        execSync(`${command} --version`);
    } catch (error) {
        if (error.status === 127) {
            vscode.window.showErrorMessage(`Command ${command} not found`);
        }
    }
}
