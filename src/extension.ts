import * as vscode from 'vscode';
import { registerDocumentSemanticTokensProvider } from './tokenizer';

export function activate(context: vscode.ExtensionContext) {
	registerDocumentSemanticTokensProvider(context);
}
