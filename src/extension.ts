import * as vscode from 'vscode';
import { initSettings } from './setting';
import { registerDocumentSemanticTokensProvider } from './tokenizer';
import { registerCompletionItemProviders } from './completor';

export function activate(context: vscode.ExtensionContext) {
	initSettings(context);
	registerDocumentSemanticTokensProvider(context);
	registerCompletionItemProviders(context);
}
