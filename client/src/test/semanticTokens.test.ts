import * as assert from 'assert';
import * as vscode from 'vscode';
import { activate, getDocUri } from './helper';

interface DecodedToken {
	line: number;
	character: number;
	length: number;
	type: string;
}

suite('Should classify FSL semantic tokens', () => {
	test('Classifies types, members, slots, and macros', async () => {
		const uri = getDocUri('semantic_tokens.fsl');
		await activate(uri);
		const legend = await vscode.commands.executeCommand<vscode.SemanticTokensLegend>(
			'vscode.provideDocumentSemanticTokensLegend', uri
		);
		const semanticTokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
			'vscode.provideDocumentSemanticTokens', uri
		);
		assert.ok(legend, 'No semantic token legend returned');
		assert.ok(semanticTokens, 'No semantic tokens returned');

		const document = await vscode.workspace.openTextDocument(uri);
		const decoded = decodeTokens(semanticTokens.data, legend.tokenTypes);
		for (let i = 1; i < decoded.length; i++) {
			const previous = decoded[i - 1];
			const current = decoded[i];
			assert.ok(current.line !== previous.line || current.character >= previous.character + previous.length,
				`Overlapping semantic tokens on line ${current.line + 1}: ${JSON.stringify(previous)} and ${JSON.stringify(current)}`);
		}
		assertToken(document, decoded, 'DATA(float3, sample_vector, TEXCOORD7);', 'float3', 'type');
		assertToken(document, decoded, 'DATA(float3, sample_vector, TEXCOORD7);', 'sample_vector', 'variable');
		assertToken(document, decoded, 'DATA(float3, sample_vector, TEXCOORD7);', 'TEXCOORD7', 'enumMember');
		assertToken(document, decoded, 'DATA(float4, second_value, SV_Target7);', 'float4', 'type');
		assertToken(document, decoded, 'DATA(float4, second_value, SV_Target7);', 'second_value', 'variable');
		assertToken(document, decoded, 'DATA(float4, second_value, SV_Target7);', 'SV_Target7', 'enumMember');
		assertToken(document, decoded, '#elif defined(FIXTURE_PATH_B)', 'FIXTURE_PATH_B', 'macro');
		assertToken(document, decoded, 'bits & g_fixture_mask_enabled', 'g_fixture_mask_enabled', 'macro');
	});
});

function decodeTokens(data: Uint32Array, tokenTypes: readonly string[]): DecodedToken[] {
	const result: DecodedToken[] = [];
	let line = 0;
	let character = 0;
	for (let i = 0; i < data.length; i += 5) {
		line += data[i];
		character = data[i] === 0 ? character + data[i + 1] : data[i + 1];
		result.push({ line, character, length: data[i + 2], type: tokenTypes[data[i + 3]] });
	}
	return result;
}

function assertToken(document: vscode.TextDocument, tokens: DecodedToken[], lineText: string, word: string, expectedType: string) {
	const line = Array.from({ length: document.lineCount }, (_, index) => index)
		.find(index => document.lineAt(index).text.includes(lineText));
	assert.notEqual(line, undefined, `Missing fixture FSL line: ${lineText}`);
	const character = document.lineAt(line!).text.indexOf(word);
	const token = tokens.find(item => item.line === line && item.character === character && item.length === word.length);
	assert.ok(token, `Missing semantic token for ${word} on line ${(line ?? 0) + 1}`);
	assert.equal(token.type, expectedType, `${word} was classified as ${token.type}, expected ${expectedType}`);
}
