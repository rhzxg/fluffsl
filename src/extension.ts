import * as vscode from 'vscode';
import { registerDocumentSemanticTokensProvider } from './tokenizer';
import { registerCompletionItemProviders } from './completor';

export function activate(context: vscode.ExtensionContext) {
	registerDocumentSemanticTokensProvider(context);
	registerCompletionItemProviders(context);
}
