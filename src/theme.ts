import { getAllGzhThemes } from "@wenyan-md/core";
import { configStore } from "@wenyan-md/core/wrapper";
import fs from "node:fs/promises";
import { getNormalizeFilePath } from "./utils.js";

export const REGISTER_THEME_SCHEMA = {
    name: "register_theme",
    description: "Register a custom theme compatible with the 'publish_article' tool to publish an article to '微信公众号'.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Name of the new custom theme.",
            },
            path: {
                type: "string",
                description: "Path to the new custom theme CSS file. It could be a path to a local file or a URL.",
            },
        },
    },
} as const;

export const REMOVE_THEME_SCHEMA = {
    name: "remove_theme",
    description: "Remove a custom theme compatible with the 'publish_article' tool to publish an article to '微信公众号'.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Name of the custom theme to remove.",
            },
        },
    },
} as const;

export function listThemes() {
    const themes = getAllGzhThemes();
    const customThemes = configStore.getThemes();
    return {
        content: [
            ...themes.map((theme) => ({
                type: "text" as const,
                text: JSON.stringify({
                    id: theme.meta.id,
                    name: theme.meta.name,
                    description: theme.meta.description,
                }),
            })),
            ...customThemes.map((theme) => ({
                type: "text" as const,
                text: JSON.stringify({
                    id: theme.id,
                    name: theme.name ?? theme.id,
                    description: theme.description ?? "自定义主题，暂无描述。",
                }),
            })),
        ],
    };
}

export async function registerTheme(name: string, path: string) {
    if (!name || !path) {
        throw new Error("When adding a theme, you must provide a name and a path.");
    }
    if (checkThemeExists(name) || checkCustomThemeExists(name)) {
        throw new Error("A theme with the given name already exists.");
    }
    if (path.startsWith("http")) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to retrieve theme from url: ${response.statusText}`);
        }
        const content = await response.text();
        configStore.addThemeToConfig(name, content);
    } else {
        const normalizePath = getNormalizeFilePath(path);
        const content = await fs.readFile(normalizePath, "utf-8");
        configStore.addThemeToConfig(name, content);
    }
    return {
        content: [
            {
                type: "text",
                text: `Theme "${name}" has been added successfully.`,
            },
        ],
    };
}

export function removeTheme(name: string) {
    if (checkThemeExists(name)) {
        throw new Error(`Can't remove builtin theme "${name}"`);
    }
    if (!checkCustomThemeExists(name)) {
        throw new Error(`Custom theme "${name}" does not exist`);
    }
    configStore.deleteThemeFromConfig(name);
    return {
        content: [
            {
                type: "text",
                text: `Theme "${name}" has been removed successfully.`,
            },
        ],
    };
}

function checkThemeExists(themeId: string): boolean {
    const themes = getAllGzhThemes();
    return themes.some((theme) => theme.meta.id === themeId);
}

function checkCustomThemeExists(themeId: string): boolean {
    const customThemes = configStore.getThemes();
    return customThemes.some((theme) => theme.id === themeId);
}
