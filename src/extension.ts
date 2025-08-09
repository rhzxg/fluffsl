import * as vscode from 'vscode';
import { MultiMap } from './multimap';

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const legend = (function () {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
		'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
		'method', 'decorator', 'macro', 'variable', 'parameter', 'property', 'label',
		'semantic', 'bracket0', 'bracket1', 'bracket2', 'bracket3', 'bracket4',
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
		const tokenized = new MultiMap(); // [row, [startIndex, endInedx]]
		this._tokenizeComments(text, result, tokenized);
		this._tokenizeBrackets(text, result, tokenized);
		this._tokenizeRestSyntax(text, result, tokenized);
		return result;
	}

	private _getConfigSet(key: string): Set<string> {
		const config = vscode.workspace.getConfiguration();
		const arr = config.get<string[]>(`fluffsl.${key}`, []);
		return new Set(arr);
	}

	private _tokenizeComments(text: string, result: IParsedToken[], tokenized: MultiMap) {
		// tokenize [/* */]
		const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
		let match: RegExpExecArray | null;
		while ((match = blockCommentRegex.exec(text)) !== null) {
			const startOffset = match.index;
			const beforeStart = text.slice(0, startOffset);
			const lastLine = text.lastIndexOf('\n', startOffset);
			const startLine = beforeStart.split(/\r?\n/).length - 1;
			const startCharacter = startOffset - lastLine - 1;

			const commentLines = match[0].split(/\r?\n/);
			for (let i = 0; i < commentLines.length; i++) {
				const line = startLine + i;
				const lineText = commentLines[i];

				result.push({
					line: line,
					startCharacter: startCharacter,
					length: lineText.length,
					tokenType: "comment",
					tokenModifiers: []
				});

				tokenized.add(line, [startCharacter, lineText.length]);
			}
		}

		// tokenize [//]
		const lineCommentRegex = /\/\/[^\r\n]*/g;
		while ((match = lineCommentRegex.exec(text)) !== null) {
			const startOffset = match.index;
			const beforeStart = text.slice(0, startOffset);
			const lastLine = text.lastIndexOf('\n', startOffset);
			const startLine = beforeStart.split(/\r?\n/).length - 1;
			const commentLine = match[0];
			const startCharacter = startOffset - lastLine - 1;

			if (tokenized.has(startLine, [startCharacter, startCharacter + commentLine.length])) {
				continue;
			}

			result.push({
				line: startLine,
				startCharacter: startCharacter,
				length: commentLine.length,
				tokenType: "comment",
				tokenModifiers: []
			});

			tokenized.add(startLine, [startCharacter, startCharacter + commentLine.length]);
		}
	}

	private _tokenizeBrackets(text: string, result: IParsedToken[], tokenized: MultiMap) {
		type Pair = [number, number];  // [row, indexInRow]
		const stackParentheses: Pair[] = [];
		const stackBrackets: Pair[] = [];
		const stackBraces: Pair[] = [];
		const brackets = new Set<string>(['(', ')', '[', ']', '{', '}']);

		// [nestedIndex, leftBracketRow, leftBracketIndexInRow, rightBracketRow, rightBracketIndexInRow]
		type Paired = [number, number, number, number, number]
		const paired: Paired[] = [];
		const commentLines = text.split(/\r?\n/);
		for (let row = 0; row < commentLines.length; ++row) {
			const commentLine = commentLines[row];
			for (let index = 0; index < commentLine.length; ++index) {
				if (tokenized.has(row, [index, index + 1])) {
					continue;
				}

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

	private _tokenizeRestSyntax(text: string, result: IParsedToken[], tokenized: MultiMap) {
		const keywords = this._getConfigSet('keywords');
		const types = this._getConfigSet('types');
		const functions = this._getConfigSet('functions');
		const semantics = this._getConfigSet('semantics');

		const operatorPattern = /([+\-*/%=!&|^]+|==|!=|>=|<=|&&|\|\||<<|>>|\+\+|--)/g;
		const keywordPattern = new RegExp(`\\b(${Array.from(keywords).join('|')})\\b|#include`, 'g');
		const typePattern = new RegExp(`\\b(${Array.from(types).join('|')})\\b`, 'g');
		const functionPattern = new RegExp(`\\b(${Array.from(functions).join('|')})\\b`, 'g');
		const semanticsPattern = new RegExp(`\\b(${Array.from(semantics).join('|')})\\b`, 'g');

		const combinedPattern = new RegExp(
			`(${operatorPattern.source}|${keywordPattern.source}|${typePattern.source}|${functionPattern.source}|${semanticsPattern.source})`,
			'g'
		);

		let match;
		while ((match = combinedPattern.exec(text)) !== null && match[0] !== '') {
			const startOffset = match.index;
			const beforeStart = text.slice(0, startOffset);
			const lastLine = text.lastIndexOf('\n', startOffset);
			const startLine = beforeStart.split(/\r?\n/).length - 1;
			const commentLine = match[0];
			const startCharacter = startOffset - lastLine - 1;

			if (tokenized.has(startLine, [startCharacter, startCharacter + commentLine.length])) {
				continue;
			}

			let tokenType = '';
			if (operatorPattern.test(commentLine)) {
				tokenType = 'operator';
			} else if (keywords.has(commentLine) || commentLine == "#include") {
				tokenType = 'keyword';
			} else if (types.has(commentLine)) {
				tokenType = 'type';
			} else if (functions.has(commentLine)) {
				tokenType = 'function';
			} else if (semantics.has(commentLine)) {
				tokenType = 'semantic';
			}

			result.push({
				line: startLine,
				startCharacter: startCharacter,
				length: commentLine.length,
				tokenType: tokenType,
				tokenModifiers: []
			});
		}
	}
}
