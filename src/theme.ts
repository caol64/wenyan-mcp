export const LIST_THEMES_SCHEMA = {
    name: "list_themes",
    description: "List the themes compatible with the 'publish_article' tool to publish an article to '微信公众号'.",
    inputSchema: {
        type: "object",
        properties: {},
    },
} as const;

export const REGISTER_THEME_SCHEMA = {
    name: "register_theme",
    description:
        "Register a custom theme compatible with the 'publish_article' tool to publish an article to '微信公众号'.",
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
    description:
        "Remove a custom theme compatible with the 'publish_article' tool to publish an article to '微信公众号'.",
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
