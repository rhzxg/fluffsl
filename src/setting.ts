import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function initSettings(context: vscode.ExtensionContext): void {
    const initializedKey = 'fluffslConfigInitialized';

    // context.globalState.update(initializedKey, false); // for test only
    // return;

    const hasInitialized = context.globalState.get<boolean>(initializedKey, false);
    if (hasInitialized) {
        return;
    }

    const config = vscode.workspace.getConfiguration();
    const insertSpaces = config.get<boolean>('editor.insertSpaces');
    if (insertSpaces !== false) {
        config.update('editor.insertSpaces', false, vscode.ConfigurationTarget.Global);
    }

    const semanticColors = config.get<any>('editor.semanticTokenColorCustomizations');
    const desiredColors = {
        enabled: true,
        rules: {
            directive: { foreground: "#808080" },
            type: { foreground: "#0000ff" },
            function: { foreground: "#880000" },
            macro: { foreground: "#6f008a" },
            semantic: { foreground: "#6f008a" },
            keyword: { foreground: "#c100db" },
            bracket0: { foreground: "#986f0d" },
            bracket1: { foreground: "#007575" },
            bracket2: { foreground: "#0078d4" },
            bracket3: { foreground: "#2d0097" },
            bracket4: { foreground: "#cc0073" }
        }
    };

    if (JSON.stringify(semanticColors) !== JSON.stringify(desiredColors)) {
        config.update(
            'editor.semanticTokenColorCustomizations',
            desiredColors,
            vscode.ConfigurationTarget.Global
        );
    }

    const packageJsonPath = path.join(context.extensionPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const configSection = packageJson.contributes?.configuration;
    if (!configSection) {
        console.warn('[FluffSL] No configuration section found in package.json');
        return;
    }

    const properties: Record<string, any> = Array.isArray(configSection)
        ? configSection.reduce((acc: Record<string, any>, cfg: any) => {
            Object.assign(acc, cfg.properties || {});
            return acc;
        }, {})
        : configSection.properties || {};

    for (const [key, meta] of Object.entries(properties)) {
        if (!('default' in meta)) continue;

        if (!key.startsWith('fluffsl.')) continue;

        const inspected = config.inspect(key);
        if (
            inspected &&
            inspected.globalValue === undefined &&
            inspected.workspaceValue === undefined &&
            inspected.workspaceFolderValue === undefined
        ) {
            config.update(key, meta.default, vscode.ConfigurationTarget.Global);
        }
    }

    context.globalState.update(initializedKey, true);
}