import * as vscode from 'vscode';
import * as path from 'path';

const sleep = (time: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, time);
    });
};

let customCancellationToken: vscode.CancellationTokenSource | null = null;

export function activate(context: vscode.ExtensionContext) {

    const openedWindows = new Set<string>();

    // Function to open the corresponding file in /infrastructure
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

    // Manual command
    const manualCommand = vscode.commands.registerCommand(
        "extension.openInfrastructureFile",
        openInfrastructureFile
    );

    // Automatic notification when opening a file in /domain
    vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId !== 'typescript') {
            return;
        }        
        const filePath = document.fileName;        
        let isRealOpen = false;
        for (const group of vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                // Check if the tab is active and if its input is a text document
                if (tab.isActive && tab.input instanceof vscode.TabInputText) {
                    // Perform actions here when a document is opened in an active tab
                    if (tab.input.uri.toString() === document.uri.toString()) {
                        isRealOpen = true;
                    }
                }
            }
        }

        if (!isRealOpen) {
            return;
        }

        if (filePath.includes(`${path.sep}domain${path.sep}`)) {
            const infrastructurePath = filePath.replace(
                `${path.sep}domain${path.sep}`,
                `${path.sep}infrastructure${path.sep}`
            );

            if (openedWindows.has(filePath)) {
                return;
            }

            vscode.workspace.fs.stat(vscode.Uri.file(infrastructurePath)).then(
                () => {
                    const message = `...${infrastructurePath.substring(infrastructurePath.lastIndexOf('infrastructure'))}`;
                    const commandId = `open-${infrastructurePath}`;
                    vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        cancellable: false,
                        },
                        async (progress, token) => {
                            return new Promise((async (resolve) => {
                                openedWindows.add(infrastructurePath);
                                customCancellationToken = new vscode.CancellationTokenSource();

                                customCancellationToken.token.onCancellationRequested(() => {
                                    customCancellationToken?.dispose();
                                    customCancellationToken = null;
                                    openedWindows.delete(infrastructurePath);
                                    resolve(null);
                                    return;
                                });

                                const seconds = 10;
                                for (let i = 0; i < seconds; i++) {
                                    progress.report({ increment: seconds, message: `[Open](command:${commandId})  ${message}` });
                                    await sleep(1000);
                                }
                                
                                openedWindows.delete(infrastructurePath);
                                resolve(null);
                            })).then(undefined, error => {
                                console.error('Error opening file:', error);
                            });
                        }
                    );

                    vscode.commands.registerCommand(commandId, () => {
                        if (customCancellationToken) {
                            customCancellationToken.cancel();
                        }

                        vscode.workspace
                            .openTextDocument(infrastructurePath)
                            .then(doc => {
                                vscode.window.showTextDocument(doc);
                            });
                    });
                },
                () => {
                    // File doesn't exist, do nothing
                }
            );
        }
    });

    context.subscriptions.push(manualCommand);
}

export function deactivate() {}