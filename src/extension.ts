'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { color } from './color';

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

const themeTempletes : {[key:string]:string} = { };

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

    async function loadTempletes() : Promise<{[key:string]:string}>
    {
        const thisExension = vscode.extensions.getExtension(`wraith13.${applicationKey}`);
        if (thisExension)
        {
            const { error, files } = await fx.readdir(`${thisExension.extensionPath}/templete/themes`);
            {
                if (error)
                {
                    await vscode.window.showErrorMessage(error.message);
                }
                else
                {
                    await Promise.all
                    (
                        files.filter(i => i.endsWith(".json")).map
                        (
                            async (i) =>
                            {
                                const { error, data } = await fx.readFile(`${thisExension.extensionPath}/templete/themes/${i}`);
                                if (error)
                                {
                                    await vscode.window.showErrorMessage(error.message);
                                }
                                else
                                {
                                    const json = data.toString();
                                    const theme = <ThemeInterface>JSON.parse(removeCommentFromJson(json));
                                    themeTempletes[theme.name] = json;
                                }
                            }
                        )
                    );
                }
            }
        }
        else
        {
            await vscode.window.showErrorMessage("Can not access to this extension's path");
        }
        return themeTempletes;
    }
    const makeSureLoadTempletes = async () : Promise<{[key:string]:string}> =>
        Object.keys(themeTempletes).length ? themeTempletes: await loadTempletes();

    export async function generate() : Promise<void>
    {
        await makeSureLoadTempletes();
        const select = await vscode.window.showQuickPick
        (
            Object.keys(themeTempletes)
                .map
                (
                    i =>
                    (
                        {
                            label: i,
                            description: "",
                        }
                    )
                )
        );
        if (select)
        {
            await applyThemeAsConfiguration
            (
                JSON.parse
                (
                    generateTheme
                    (
                        JSON.stringify(themeTempletes[select.label]),
                        "phi dark",
                        "#004422"
                    )
                )
            );
        }
        await vscode.window.showInformationMessage('Hello Phi Color Theme!');
    }
    
    const calcHueIndex = (baseColor : color.ColorHsl, targetColor : color.ColorHsl, indexSize : number = 13) : number =>
        (Math.round((targetColor.h -baseColor.h) * indexSize / (Math.PI * 2)) +indexSize) % indexSize;
    const calcSaturationIndex = (baseColor : color.ColorHsl, targetColor : color.ColorHsl) : number =>
        Math.round(Math.log(Math.max(targetColor.s, 0.01) / Math.max(baseColor.s, 0.01)) / Math.log(color.phi));

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
        const rgb = color.rgbFromStyle(baseColor);
        var hsl = color.rgbToHsl(rgb);
        if (undefined !== h)
        {
            hsl.h += Math.PI *2 / color.phi *h;
        }
        if (undefined !== s)
        {
            hsl.s = s < 0.0 ?
                hsl.s / Math.pow(color.phi, -s):
                color.colorHslSMAx -((color.colorHslSMAx - hsl.s) / Math.pow(color.phi, s));
        }
        if (undefined !== l)
        {
            hsl.l = l < 0.0 ?
                hsl.l / Math.pow(color.phi, -l):
                1.0 -((1.0 - hsl.l) / Math.pow(color.phi, l));
        }
        if (isAlignLuma)
        {
            const baseLuuma = color.rgbToLuma(rgb);
            const luuma = color.rgbToLuma(color.hslToRgb(hsl));
            hsl.l += baseLuuma -luuma;
        }
        return color.rgbForStyle
        (
            color.hslToRgb
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
