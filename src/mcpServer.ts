import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
    LIST_THEMES_SCHEMA,
    listThemes,
    REGISTER_THEME_SCHEMA,
    registerTheme,
    REMOVE_THEME_SCHEMA,
    removeTheme,
} from "./theme.js";
import { PUBLISH_ARTICLE_SCHEMA, PUBLISH_ARTICLE_SSE_SCHEMA, publishArticle } from "./publish.js";
import path from "node:path";
import os from "node:os";
import { globalStates } from "./utils.js";
import { saveBase64Image, UPLOAD_ASSET_SCHEMA } from "./upload.js";

const UPLOAD_DIR = path.join(os.tmpdir(), "wenyan-mcp-uploads");

/**
 * Create and configure an MCP server instance.
 */
export function createServer(): Server {
    const server = new Server(
        {
            name: "wenyan-mcp",
            version: "2.0.1",
        },
        {
            capabilities: {
                resources: {},
                tools: {},
                prompts: {},
                // logging: {},
            },
        },
    );

    /**
     * Handler that lists available tools.
     * Exposes a single "publish_article" tool that lets clients publish new article.
     */
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        if (globalStates.isSSE) {
            return {
                tools: [
                    PUBLISH_ARTICLE_SSE_SCHEMA,
                    UPLOAD_ASSET_SCHEMA,
                    LIST_THEMES_SCHEMA,
                    REGISTER_THEME_SCHEMA,
                    REMOVE_THEME_SCHEMA,
                ],
            };
        } else {
            return {
                tools: [PUBLISH_ARTICLE_SCHEMA, LIST_THEMES_SCHEMA, REGISTER_THEME_SCHEMA, REMOVE_THEME_SCHEMA],
            };
        }
    });

    /**
     * Handler for the publish_article tool.
     * Publish a new article with the provided title and content, and returns success message.
     */
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === "publish_article") {
            const args = request.params.arguments || {};
            const appId = args.wechat_app_id ? String(args.wechat_app_id) : undefined;
            const appSecret = args.wechat_app_secret ? String(args.wechat_app_secret) : undefined;
            const content = String(args.content || "");
            const contentUrl = String(args.content_url || "");
            const file = String(args.file || "");
            const fileId = String(args.file_id || "");
            const themeId = String(args.theme_id || "");
            return await publishArticle(fileId, contentUrl, file, content, themeId, appId, appSecret);
        } else if (request.params.name === "list_themes") {
            return listThemes();
        } else if (request.params.name === "register_theme") {
            return await registerTheme(
                String(request.params.arguments?.name || ""),
                String(request.params.arguments?.path || ""),
            );
        } else if (request.params.name === "remove_theme") {
            return removeTheme(String(request.params.arguments?.name || ""));
        } else if (request.params.name === "upload_asset") {
            const filename = String(request.params.arguments?.filename || "");
            const base64 = String(request.params.arguments?.base64 || "");
            if (!filename || !base64) {
                throw new Error("Filename and base64 content are required.");
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(await saveBase64Image(filename, base64)),
                    },
                ],
            };
        }

        throw new Error("Unknown tool");
    });

    return server;
}
