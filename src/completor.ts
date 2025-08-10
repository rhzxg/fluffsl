import * as vscode from 'vscode';
import { TokenCache } from './token';

export function registerCompletionItemProviders(context: vscode.ExtensionContext): void {
	const regularCompletionProvider = vscode.languages.registerCompletionItemProvider('fsl', {
		provideCompletionItems(_document: vscode.TextDocument, _position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext) {
			const regularCompletionItems = _getRegularCompletionItems(_document);
			return [...regularCompletionItems];
		}
	});
	context.subscriptions.push(regularCompletionProvider);

	const dotCompletionProvider = vscode.languages.registerCompletionItemProvider('fsl', {
		provideCompletionItems(_document: vscode.TextDocument, _position: vscode.Position) {
			return undefined;
		}
	}, '.');
	context.subscriptions.push(dotCompletionProvider);
}

function _getRegularCompletionItems(document: vscode.TextDocument): vscode.CompletionItem[] {
	const tokens = TokenCache.getTokenCacheByDoc(document.uri.fsPath);
	if (tokens == undefined || !tokens.has('keyword')) {
		return [];
	}

	const result: vscode.CompletionItem[] = [];
	const map = new Map<string, vscode.CompletionItemKind | undefined>([
		["directive", undefined],
		["keyword", vscode.CompletionItemKind.Keyword],
		["type", vscode.CompletionItemKind.TypeParameter],
		["function", vscode.CompletionItemKind.Function],
		["semantic", undefined],
		["macro", undefined],
		["variable", vscode.CompletionItemKind.Variable],
	]);
	map.forEach((value: vscode.CompletionItemKind | undefined, key: string) => {
		if (tokens.has(key)) {
			tokens.get(key)!.forEach((token: string) => {
				if (value !== undefined) {
					result.push(new vscode.CompletionItem(token, value));
				}
				else {
					result.push(new vscode.CompletionItem(token));
				}
			});
		}
	});

	return result;
}
