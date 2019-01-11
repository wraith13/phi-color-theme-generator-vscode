'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';

module fx
{
    export function readdir(path : string)
        : Thenable<{ error : NodeJS.ErrnoException, files : string[] }>
    {
        return new Promise
        (
            resolve => fs.readdir
            (
                path,
                (error : NodeJS.ErrnoException, files : string[]) => resolve
                (
                    {
                        error,
                        files
                    }
                )
            )
        );
    }

    export function exists(path : string) : Thenable<boolean>
    {
        return new Promise
        (
            resolve => fs.exists
            (
                path,
                exists => resolve(exists)
            )
        );
    }

    export function readFile(path : string)
        : Thenable<{ error : NodeJS.ErrnoException, data : Buffer }>
    {
        return new Promise
        (
            resolve => fs.readFile
            (
                path,
                (error : NodeJS.ErrnoException, data : Buffer) => resolve({ error, data })
            )
        );
    }
}

interface ThemeInterface
{
    $schema : string;
    name : string;
    type : string;
    colors : object;
    tokenColors : object;
}

const themeTempletes : {[key:string]:ThemeInterface} ={};

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

    const removeCommentFromJson = (json : string) : string => json
        .replace(/\/\*[\S\s]*?\*\//g, "")
        .replace(/\/\/.*/g, "");
        //  とりあえず雑に処理

    export async function generate() : Promise<void>
    {
        const thisExension = vscode.extensions.getExtension(`wraith13.${applicationKey}`);
        if (thisExension)
        {
            const { error, data } = await fx.readFile(`${thisExension.extensionPath}${themeTempletes.dark}`);
            {
                if (error)
                {
                    await vscode.window.showErrorMessage(error.message);
                }
                else
                {
                    await applyThemeAsConfiguration(JSON.parse(generateTheme(data.toString(), "phi dark", "#004422")));
                }
            }
        }
        else
        {
            await vscode.window.showErrorMessage("Can not access to this extension's path");
        }
        await vscode.window.showInformationMessage('Hello Phi Color Theme!');
    }
    
    function generateTheme(templete : string, name : string, baseColor : string) : string
    {
        return templete
            .replace(/getThemeName\(\)/, name)
            .replace
            (
                /generateColor\(([+-]?\d)\,([+-]?\d)\,([+-]?\d)\)/g,
                (_match, h, s, l, _offset, _text) => generateColor
                (
                    baseColor,
                    parseInt(h),
                    parseInt(s),
                    parseInt(l)
                )
            );
    }

    function generateColor(baseColor : string, h : number, s : number, l :number, isAlignLuma : boolean = true) : string
    {
        const rgb = rgbFromStyle(baseColor);
        var hsl = rgbToHsl(rgb);
		if (undefined !== h)
		{
            hsl.h += Math.PI *2 / phi *h;
		}
		if (undefined !== s)
		{
            hsl.s = s < 0.0 ?
                hsl.s / Math.pow(phi, -s):
                colorHslSMAx -((colorHslSMAx - hsl.s) / Math.pow(phi, s));
		}
		if (undefined !== l)
		{
            hsl.l = l < 0.0 ?
                hsl.l / Math.pow(phi, -l):
                1.0 -((1.0 - hsl.l) / Math.pow(phi, l));
		}
		if (isAlignLuma)
		{
            const baseLuuma = rgbToLuma(rgb);
			const luuma = rgbToLuma(hslToRgb(hsl));
			hsl.l += baseLuuma -luuma;
		}
        return rgbForStyle
        (
            hslToRgb
            (
                {
                    "h": hsl.h,
                    "s": hsl.s,
                    "l": hsl.l,
                }
            )
        );
    }

    export async function applyThemeAsConfiguration
    (
        theme : { colors : any, tokenColors : any, },
        configurationTarget : boolean | vscode.ConfigurationTarget = true
    ) : Promise<void>
    {
        //  "colors"
        await getConfiguration(undefined, "workbench").update
        (
            "colorCustomizations",
            theme.colors,
            configurationTarget
        );
        //  "tokenColors"
        await getConfiguration(undefined, "editor").update
        (
            "tokenColorCustomizations",
            {
                "textMateRules": theme.tokenColors
            },
            configurationTarget
        );
    }
}

export function activate(context: vscode.ExtensionContext) : void
{
    PhiColorTheme.initialize(context);
}

export function deactivate() : void
{
}
