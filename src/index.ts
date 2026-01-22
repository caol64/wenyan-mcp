#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getGzhContent } from "@wenyan-md/core/wrapper";
import { publishToDraft } from "@wenyan-md/core/publish";
import { themes, Theme } from "@wenyan-md/core/theme";
import { getNormalizeFilePath } from "./utils.js";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new Server(
    {
        name: "wenyan-mcp",
        version: "0.1.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
            prompts: {},
            // logging: {},
        },
    }
);

/**
 * Handler that lists available tools.
 * Exposes a single "publish_article" tool that lets clients publish new article.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "publish_article",
                description: "Format a Markdown article using a selected theme and publish it to '微信公众号'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: {
                            type: "string",
                            description:
                                "The Markdown text to publish. REQUIRED if 'file' is not provided. Preserves frontmatter if present.",
                        },
                        file: {
                            type: "string",
                            description:
                                "The path to the Markdown file (absolute or relative). REQUIRED if 'content' is not provided.",
                        },
                        theme_id: {
                            type: "string",
                            description:
                                "ID of the theme to use (e.g., default, orangeheart, rainbow, lapis, pie, maize, purple, phycat).",
                        },
                    },
                },
            },
            {
                name: "list_themes",
                description:
                    "List the themes compatible with the 'publish_article' tool to publish an article to '微信公众号'.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

/**
 * Handler for the publish_article tool.
 * Publish a new article with the provided title and content, and returns success message.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "publish_article") {
        // server.sendLoggingMessage({
        //     level: "debug",
        //     data: JSON.stringify(request.params.arguments),
        // });
        const contentArg = request.params.arguments?.content;
        const fileArg = request.params.arguments?.file;
        if (!contentArg && !fileArg) {
            throw new Error("You must provide either 'content' or 'file' to publish an article.");
        }
        let content = String(contentArg || "");
        const file = String(fileArg || "");
        const themeId = String(request.params.arguments?.theme_id || "");
        let absoluteDirPath: string | undefined;
        if (!content && file) {
            const normalizePath = getNormalizeFilePath(file);
            content = await fs.readFile(normalizePath, "utf-8");
            if (!content) {
                throw new Error("Can't read content from the specified file.");
            }
            absoluteDirPath = path.dirname(normalizePath);
        }
        const gzhContent = await getGzhContent(content, themeId, "solarized-light", true, true);
        if (!gzhContent.title) {
            throw new Error("Can't extract a valid title from the frontmatter.");
        }
        if (!gzhContent.cover) {
            throw new Error("Can't extract a valid cover from the frontmatter or article.");
        }
        const response = await publishToDraft(gzhContent.title, gzhContent.content, gzhContent.cover, {
            relativePath: absoluteDirPath,
        });

        return {
            content: [
                {
                    type: "text",
                    text: `Your article was successfully published to '公众号草稿箱'. The media ID is ${response.media_id}.`,
                },
            ],
        };
    } else if (request.params.name === "list_themes") {
        const themeResources = Object.entries(themes).map(([id, theme]: [string, Theme]) => ({
            type: "text",
            text: JSON.stringify({
                id: theme.id,
                name: theme.name,
                description: theme.description,
            }),
        }));
        return {
            content: themeResources,
        };
    }

    throw new Error("Unknown tool");
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
