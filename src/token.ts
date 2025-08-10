import * as vscode from 'vscode';

export interface IParsedToken {
	line: number;
	startIndexInLine: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

export class TokenCache {
	private static doc2Tokens = new Map<string, Map<string, Set<string>>>();

	static buildTokenCacheByDoc(document: vscode.TextDocument, parsedTokens: IParsedToken[]) {
		const tokens = new Map<string, Set<string>>;
		parsedTokens.forEach((parsedToken: IParsedToken) => {
			const token = document.lineAt(parsedToken.line).text.slice(parsedToken.startIndexInLine, parsedToken.startIndexInLine + parsedToken.length);
			if (!tokens.has(parsedToken.tokenType)) {
				tokens.set(parsedToken.tokenType, new Set());
			}
			tokens.get(parsedToken.tokenType)!.add(token);
		});
		TokenCache.doc2Tokens.set(document.uri.fsPath, tokens);
	}

	static getTokenCacheByDoc(docFsPath: string): Map<string, Set<string>> | undefined {
		return TokenCache.doc2Tokens.get(docFsPath);
	}

	static removeTokenCacheByDoc(docFsPath: string) {
		TokenCache.doc2Tokens.delete(docFsPath);
	}
}
