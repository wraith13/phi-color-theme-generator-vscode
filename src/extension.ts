'use strict';
import * as vscode from 'vscode';

export module PhiColorTheme
{
    //let pass_through;

    const applicationKey = "phi-color-theme-generator";

    export function initialize(context : vscode.ExtensionContext): void
    {
        context.subscriptions.push
        (
            vscode.commands.registerCommand(`${applicationKey}.generate`, generate)
        );
    }

    export async function generate() : Promise<void>
    {
        await vscode.window.showInformationMessage('Hello Phi Color Theme!');
    }
}

export function activate(context: vscode.ExtensionContext) : void
{
    PhiColorTheme.initialize(context);
}

export function deactivate() : void
{
}
