import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as jsbeautify from "js-beautify";
import * as mkdirp from "mkdirp";

type SupportedLanguage = "css" | "scss" | "javascript" | "html" | "json";


function getRootPath(): string {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ".";
}


function getBeautifyOptions(languageId: SupportedLanguage): any {
    const globalConfig = path.join(__dirname, "formatter.json");
    const localConfig = path.join(getRootPath(), ".vscode", "formatter.json");

    let options: any = {};

    try {
        options = require(localConfig)[languageId];
    } catch {
        try {
            options = require(globalConfig)[languageId];
        } catch {
            options = {};
        }
    }

    if (languageId === "javascript") {
        options.space_in_paren = false;
        options.space_in_empty_paren = false;
        options.space_after_anon_function = false;
        options.jslint_happy = false;
        options.keep_array_indentation = false;
        options.preserve_newlines = true;
        options.space_before_conditional = true;
        options.operator_position = "before-newline";
    }

    return options;
}

function beautifyContent(
    documentContent: string,
    languageId: string
): string | undefined {
    let beautifyFunc: ((text: string, opts: any) => string) | null = null;
    let lang: SupportedLanguage;

    switch (languageId) {
        case "scss":
            lang = "css";
            beautifyFunc = jsbeautify.css;
            break;
        case "css":
            lang = "css";
            beautifyFunc = jsbeautify.css;
            break;
        case "json":
            lang = "javascript";
            beautifyFunc = jsbeautify.js;
            break;
        case "javascript":
            lang = "javascript";
            beautifyFunc = jsbeautify.js;
            break;
        case "html":
            lang = "html";
            beautifyFunc = jsbeautify.html;
            break;
        default:
            vscode.window.showInformationMessage(
                "U:Bodigat Code Formatter: Diese Sprache wird aktuell nicht unterstützt (nur JS, JSON, CSS, SCSS, HTML)."
            );
            return;
    }

    const options = getBeautifyOptions(lang);
    return beautifyFunc(documentContent, options);
}

export function format(
    document: vscode.TextDocument,
    range?: vscode.Range | null
): vscode.TextEdit[] {
    if (!range) {
        const start = new vscode.Position(0, 0);
        const lastLine = document.lineCount - 1;
        const end = new vscode.Position(
            lastLine,
            document.lineAt(lastLine).text.length
        );
        range = new vscode.Range(start, end);
    }

    const content = document.getText(range);
    const formatted = beautifyContent(content, document.languageId);

    if (!formatted) {
        return [];
    }

    return [vscode.TextEdit.replace(range, formatted)];
}

class Formatter {
    beautify() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const edits = format(editor.document, null);
        if (!edits.length) {
            return;
        }

        editor.edit((editBuilder) => {
            for (const e of edits) {
                editBuilder.replace(e.range, e.newText);
            }
        });
    }

    onSave(e: vscode.TextDocumentWillSaveEvent) {
        const document = e.document;
        const supported: SupportedLanguage[] = [
            "css",
            "scss",
            "javascript",
            "html",
            "json",
        ];

        if (!supported.includes(document.languageId as SupportedLanguage)) {
            return;
        }

        const globalConfig = path.join(__dirname, "formatter.json");
        const localConfig = path.join(
            getRootPath(),
            ".vscode",
            "formatter.json"
        );

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

        if (!onSave) {
            return;
        }

        const edits = format(document, null);
        if (!edits.length) {
            return;
        }

        e.waitUntil(Promise.resolve(edits));
    }

    generateLocalConfig() {
        const local = path.join(getRootPath(), ".vscode", "formatter.json");
        const src = path.join(__dirname, "formatter.json");

        const content = fs.readFileSync(src, "utf8");
        mkdirp.sync(path.dirname(local));

        if (fs.existsSync(local)) {
            vscode.window.showInformationMessage(
                `Local config existiert bereits: ${local}`
            );
            return;
        }

        fs.writeFile(local, content, (err) => {
            if (err) {
                vscode.window.showInformationMessage(
                    `Fehler beim Schreiben der Config: ${err.message}`
                );
            } else {
                vscode.window.showInformationMessage(
                    `Lokale Config erstellt: ${local}`
                );
            }
        });
    }

    openConfigCommand() {
        const localFile = path.join(getRootPath(), ".vscode", "formatter.json");
        const globalFile = path.join(__dirname, "formatter.json");

        this.openConfig(
            localFile,
            () =>
                vscode.window.showInformationMessage(
                    "[Local] VS Code nach dem Bearbeiten neu starten."
                ),
            () =>
                this.openConfig(
                    globalFile,
                    () =>
                        vscode.window.showInformationMessage(
                            "[Global] VS Code nach dem Bearbeiten neu starten."
                        ),
                    () =>
                        vscode.window.showInformationMessage(
                            "Keine formatter.json gefunden."
                        )
                )
        );
    }

    private openConfig(
        filename: string,
        succ?: () => void,
        fail?: () => void
    ) {
        vscode.workspace.openTextDocument(filename).then(
            (doc) => {
                vscode.window.showTextDocument(doc).then(() => {
                    succ && succ();
                });
            },
            () => {
                fail && fail();
            }
        );
    }
}


export function activate(context: vscode.ExtensionContext) {
    const languages: SupportedLanguage[] = [
        "css",
        "scss",
        "javascript",
        "html",
        "json",
    ];

    const formatter = new Formatter();

    for (const lang of languages) {
        context.subscriptions.push(
            vscode.languages.registerDocumentFormattingEditProvider(lang, {
                provideDocumentFormattingEdits(
                    document: vscode.TextDocument
                ): vscode.TextEdit[] {
                    return format(document, null);
                },
            })
        );

        context.subscriptions.push(
            vscode.languages.registerDocumentRangeFormattingEditProvider(
                lang,
                {
                    provideDocumentRangeFormattingEdits(
                        document: vscode.TextDocument,
                        range: vscode.Range
                    ): vscode.TextEdit[] {
                        return format(document, range);
                    },
                }
            )
        );
    }

    context.subscriptions.push(
        vscode.commands.registerCommand("formatter.beautify", () =>
            formatter.beautify()
        )
    );

    context.subscriptions.push(
        vscode.workspace.onWillSaveTextDocument((e) =>
            formatter.onSave(e)
        )
    );
}

export function deactivate() {}  