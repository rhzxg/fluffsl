import * as vscode from 'vscode';

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const legend = (function () {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
		'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
		'method', 'decorator', 'macro', 'variable', 'parameter', 'property', 'label',
		'bracket0', 'bracket1', 'bracket2', 'bracket3', 'bracket4',
	];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

	const tokenModifiersLegend: string[] = [];
	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

	return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'fsl' }, new DocumentSemanticTokensProvider(), legend));
}

interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
	async provideDocumentSemanticTokens(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
		const allTokens = this._parseText(document.getText());
		const builder = new vscode.SemanticTokensBuilder();
		allTokens.forEach((token) => {
			builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
		});
		return builder.build();
	}

	private _encodeTokenType(tokenType: string): number {
		if (tokenTypes.has(tokenType)) {
			return tokenTypes.get(tokenType)!;
		} else if (tokenType === 'notInLegend') {
			return tokenTypes.size + 2;
		}
		return 0;
	}

	private _encodeTokenModifiers(strTokenModifiers: string[]): number {
		let result = 0;
		for (const tokenModifier of strTokenModifiers) {
			if (tokenModifiers.has(tokenModifier)) {
				result = result | (1 << tokenModifiers.get(tokenModifier)!);
			} else if (tokenModifier === 'notInLegend') {
				result = result | (1 << tokenModifiers.size + 2);
			}
		}
		return result;
	}

	private _parseText(text: string): IParsedToken[] {
		const result: IParsedToken[] = [];
		const tokenized = new Set<number>();
		this._tokenizeComments(text, result, tokenized);
		this._tokenizeBrackets(text, result, tokenized);
		return result;
	}

	private _getConfigSet(key: string): Set<string> {
		const config = vscode.workspace.getConfiguration();
		const arr = config.get<string[]>(`fluffsl.${key}`, []);
		return new Set(arr);
	}

	private _tokenizeComments(text: string, result: IParsedToken[], tokenized: Set<number>) {
		// tokenize [/* */]
		const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
		let match: RegExpExecArray | null;
		while ((match = blockCommentRegex.exec(text)) !== null) {
			const startOffset = match.index;
			const beforeStart = text.slice(0, startOffset);
			const startLine = beforeStart.split(/\r?\n/).length - 1;

			const commentLines = match[0].split(/\r?\n/);
			for (let i = 0; i < commentLines.length; i++) {
				const line = startLine + i;
				const lineText = commentLines[i];

				result.push({
					line: line,
					startCharacter: 0,
					length: lineText.length,
					tokenType: "comment",
					tokenModifiers: []
				});

				tokenized.add(line);
			}
		}

		// tokenize [//]
		const lineCommentRegex = /\/\/[^\r\n]*/g;
		while ((match = lineCommentRegex.exec(text)) !== null) {
			if (tokenized.has(match.index)) {
				continue;
			}

			const startOffset = match.index;
			const beforeStart = text.slice(0, startOffset);
			const lastLine = text.lastIndexOf('\n', startOffset);
			const startLine = beforeStart.split(/\r?\n/).length - 1;
			const commentLine = match[0];
			const startCharacter = startOffset - lastLine - 1;

			result.push({
				line: startLine,
				startCharacter: startCharacter,
				length: commentLine.length,
				tokenType: "comment",
				tokenModifiers: []
			});

			tokenized.add(startLine);
		}
	}

	private _tokenizeBrackets(text: string, result: IParsedToken[], tokenized: Set<number>) {
		type Tuple = [number, number];  // [row, indexInRow]
		const stackParentheses: Tuple[] = [];
		const stackBrackets: Tuple[] = [];
		const stackBraces: Tuple[] = [];
		const brackets = new Set<string>(['(', ')', '[', ']', '{', '}']);

		// [nestedIndex, leftBracketRow, leftBracketIndexInRow, rightBracketRow, rightBracketIndexInRow]
		type Paired = [number, number, number, number, number]
		const paired: Paired[] = [];
		const commentLines = text.split(/\r?\n/);
		for (let row = 0; row < commentLines.length; ++row) {
			if (tokenized.has(row)) {
				continue;
			}

			const commentLine = commentLines[row];
			for (let index = 0; index < commentLine.length; ++index) {
				const c = commentLine[index];
				if (!brackets.has(c)) {
					continue;
				}

				if (c === '(') {
					stackParentheses.push([row, index]);
				} else if (c === ')') {
					const last = stackParentheses.pop();
					if (last) {
						paired.push([stackParentheses.length, last[0], last[1], row, index]);
					}
				} else if (c === '[') {
					stackBrackets.push([row, index]);
				} else if (c === ']') {
					const last = stackBrackets.pop();
					if (last) {
						paired.push([stackBrackets.length, last[0], last[1], row, index]);
					}
				} else if (c === '{') {
					stackBraces.push([row, index]);
				} else if (c === '}') {
					const last = stackBraces.pop();
					if (last) {
						paired.push([stackBraces.length, last[0], last[1], row, index]);
					}
				}
			}
		}

		paired.forEach((pair) => {
			const tokenType = "bracket" + (pair[0] % 5).toString();
			result.push({
				line: pair[1],
				startCharacter: pair[2],
				length: 1,
				tokenType: tokenType,
				tokenModifiers: []
			});
			result.push({
				line: pair[3],
				startCharacter: pair[4],
				length: 1,
				tokenType: tokenType,
				tokenModifiers: []
			});
		});
	}
}
