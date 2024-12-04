import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    // Función para abrir el archivo correspondiente en /infrastructure
    const openInfrastructureFile = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found.");
            return;
        }

        const filePath = editor.document.fileName;

        if (!filePath.includes(`${path.sep}domain${path.sep}`)) {
            vscode.window.showErrorMessage("This file is not in the /domain directory.");
            return;
        }

        const infrastructurePath = filePath.replace(
            `${path.sep}domain${path.sep}`,
            `${path.sep}infrastructure${path.sep}`
        );

        const fileExists = await vscode.workspace.fs.stat(vscode.Uri.file(infrastructurePath)).then(
            () => true,
            () => false
        );

        if (!fileExists) {
            vscode.window.showErrorMessage(
                "The corresponding file in /infrastructure does not exist."
            );
            return;
        }

        const doc = await vscode.workspace.openTextDocument(infrastructurePath);
        await vscode.window.showTextDocument(doc);
    };

    // Comando manual
    const manualCommand = vscode.commands.registerCommand(
        "extension.openInfrastructureFile",
        openInfrastructureFile
    );

    // Notificación automática al abrir un archivo en /domain
    vscode.workspace.onDidOpenTextDocument(document => {
        const filePath = document.fileName;
        if (filePath.includes(`${path.sep}domain${path.sep}`)) {
            const infrastructurePath = filePath.replace(
                `${path.sep}domain${path.sep}`,
                `${path.sep}infrastructure${path.sep}`
            );

            vscode.workspace.fs.stat(vscode.Uri.file(infrastructurePath)).then(
                () => {
                    vscode.window
                        .showInformationMessage(
                            `Implementation found on ${infrastructurePath}`,
                            'Open',
                            'Ignore'
                        )
                        .then(selection => {
                            if (selection === 'Open') {
                                vscode.workspace
                                    .openTextDocument(infrastructurePath)
                                    .then(doc => {
                                        vscode.window.showTextDocument(doc);
                                    });
                            }
                        });
                },
                () => {
                    // Archivo no existe, no hace nada
                }
            );
        }
    });

    context.subscriptions.push(manualCommand);
}

export function deactivate() {}