'use strict';
import * as vscode from 'vscode';

export module PhiColorTheme
{
    //let pass_through;

    const applicationKey = "phi-color-theme-generator";

    function getConfiguration<type = vscode.WorkspaceConfiguration>(key? : string, section : string = applicationKey) : type
    {
        const rawKey = undefined === key ? undefined: key.split(".").reverse()[0];
        const rawSection = undefined === key || rawKey === key ? section: `${section}.${key.replace(/(.*)\.[^\.]+/, "$1")}`;
        const configuration = vscode.workspace.getConfiguration(rawSection);
        return rawKey ?
            configuration[rawKey] :
            configuration;
    }

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
