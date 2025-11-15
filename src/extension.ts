import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsbeautify from 'js-beautify';
import * as mkdirp from 'mkdirp';

export function format(document: vscode.TextDocument, range: vscode.Range | null) {
    if (range === null || !range) {
        const start = new vscode.Position(0, 0);
        const end = new vscode.Position(
            document.lineCount - 1,
            document.lineAt(document.lineCount - 1).text.length
        );
        range = new vscode.Range(start, end);
    }

    const result: vscode.TextEdit[] = [];
    const content = document.getText(range);
    const formatted = beautifyContent(content, document.languageId);

    if (formatted) {
        result.push(new vscode.TextEdit(range, formatted));
    }

    return result;
}

function getRootPath() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '.';
}

function beautifyContent(documentContent: string, languageId: string): string | undefined {
    const globalConfig = path.join(__dirname, 'formatter.json');
    const localConfig = path.join(getRootPath(), '.vscode', 'formatter.json');

    let beautifyFunc: any = null;

    switch (languageId) {
        case 'scss':
            languageId = 'css';
        case 'css':
            beautifyFunc = jsbeautify.css;
            break;
        case 'json':
            languageId = 'javascript';
        case 'javascript':
            beautifyFunc = jsbeautify.js;
            break;
        case 'html':
            beautifyFunc = jsbeautify.html;
            break;
        default:
            showMessage('Sorry, this language is not supported. Only JS, CSS, HTML.');
            return;
    }

    let beautifyOptions: any = {};

    try {
        beautifyOptions = require(localConfig)[languageId];
    } catch {
        try {
            beautifyOptions = require(globalConfig)[languageId];
        } catch {
            beautifyOptions = {};
        }
    }

    // 🧠 Fix für veraltete js-beautify Defaults
    if (languageId === 'javascript') {
        beautifyOptions.space_in_paren = false;
        beautifyOptions.space_in_empty_paren = false;
        beautifyOptions.space_after_anon_function = false;
        beautifyOptions.jslint_happy = false;
        beautifyOptions.keep_array_indentation = false;
        beautifyOptions.preserve_newlines = true;
        beautifyOptions.space_before_conditional = true;
        beautifyOptions.operator_position = 'before-newline';
    }

    return beautifyFunc(documentContent, beautifyOptions);
}

// -------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
    const docTypes = ['css', 'scss', 'javascript', 'html', 'json'];
    const formatter = new Formatter();

    for (const type of docTypes) {
        registerDocType(type);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('Lonefy.formatting', () => formatter.beautify())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Lonefy.formatterConfig', () => formatter.openConfigCommand())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Lonefy.formatterCreateLocalConfig', () => formatter.generateLocalConfig())
    );

    context.subscriptions.push(
        vscode.workspace.onWillSaveTextDocument(e => formatter.onSave(e))
    );

    function registerDocType(type: string) {
        context.subscriptions.push(
            vscode.languages.registerDocumentFormattingEditProvider(type, {
                provideDocumentFormattingEdits(document) {
                    return formatter.registerBeautify(null);
                },
            })
        );
    }
}

// -------------------------------------------------------------------

class Formatter {
    public beautify() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) return;

        const document = activeEditor.document;
        const start = new vscode.Position(0, 0);
        const end = new vscode.Position(
            document.lineCount - 1,
            document.lineAt(document.lineCount - 1).text.length
        );
        const range = new vscode.Range(start, end);

        const content = document.getText(range);
        const formatted = beautifyContent(content, document.languageId);

        if (formatted) {
            activeEditor.edit(editor => editor.replace(range, formatted));
        }
    }

    public registerBeautify(range: vscode.Range | null) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        return format(editor.document, range);
    }

    public generateLocalConfig() {
        const local = path.join(getRootPath(), '.vscode', 'formatter.json');
        const content = fs.readFileSync(path.join(__dirname, 'formatter.json'), 'utf8');

        mkdirp.sync(path.dirname(local));
        if (fs.existsSync(local)) {
            showMessage(`Local config already exists: ${local}`);
            return;
        }

        fs.writeFile(local, content, err => {
            if (err) showMessage(`Error writing config: ${err.message}`);
            else showMessage(`Generated local config: ${local}`);
        });
    }

    public openConfigCommand() {
        const localFile = path.join(getRootPath(), '.vscode', 'formatter.json');
        const globalFile = path.join(__dirname, 'formatter.json');

        this.openConfig(
            localFile,
            () => showMessage('[Local] Restart VSCode after editing'),
            () =>
                this.openConfig(
                    globalFile,
                    () => showMessage('[Global] Restart VSCode after editing'),
                    () => showMessage('No formatter.json found')
                )
        );
    }

    public openConfig(filename: string, succ?: Function, fail?: Function) {
        vscode.workspace.openTextDocument(filename).then(
            doc => vscode.window.showTextDocument(doc).then(() => succ && succ()),
            () => fail && fail()
        );
    }

    public onSave(e: vscode.TextDocumentWillSaveEvent) {
        const { document } = e;
        const supported = ['css', 'scss', 'javascript', 'html', 'json'];
        if (supported.indexOf(document.languageId) === -1) return;

        const globalConfig = path.join(__dirname, 'formatter.json');
        const localConfig = path.join(getRootPath(), '.vscode', 'formatter.json');

        let onSave = true;
        try {
            onSave = require(localConfig).onSave;
        } catch {
            try {
                onSave = require(globalConfig).onSave;
            } catch {
                onSave = true;
            }
        }

        if (!onSave) return;

        const start = new vscode.Position(0, 0);
        const end = new vscode.Position(
            document.lineCount - 1,
            document.lineAt(document.lineCount - 1).text.length
        );
        const range = new vscode.Range(start, end);
        const content = document.getText(range);
        const formatted = beautifyContent(content, document.languageId);

        if (formatted) {
            const edit = vscode.TextEdit.replace(range, formatted);
            e.waitUntil(Promise.resolve([edit]));
        }
    }
}

// -------------------------------------------------------------------

function showMessage(msg: string) {
    vscode.window.showInformationMessage(msg);
}

export function deactivate() {}