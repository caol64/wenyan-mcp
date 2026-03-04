import { renderAndPublish, renderAndPublishToServer } from "@wenyan-md/core/wrapper";
import { buildMcpResponse, getInputContent, globalStates } from "./utils.js";

export const PUBLISH_ARTICLE_SCHEMA = {
    name: "publish_article",
    description: "Format a Markdown article using a selected theme and publish it to '微信公众号'.",
    inputSchema: {
        type: "object",
        properties: {
            content: {
                type: "string",
                description:
                    "The Markdown text to publish. REQUIRED if 'file' or 'content_url' is not provided. DO INCLUDE frontmatter if present.",
            },
            content_url: {
                type: "string",
                description:
                    "A URL (e.g. GitHub raw link) to a Markdown file. Preferred over 'content' for large files to save tokens.",
            },
            file: {
                type: "string",
                description:
                    "The local path (absolute or relative) to a Markdown file. Preferred over 'content' for large files to save tokens.",
            },
            theme_id: {
                type: "string",
                description:
                    "ID of the theme to use (e.g., default, orangeheart, rainbow, lapis, pie, maize, purple, phycat).",
            },
        },
    },
} as const;

export async function publishArticle(contentUrl: string, file: string, content: string, themeId: string, clientVersion?: string) {
    let mediaId = "";
    const publishOptions = {
        file: file ? file : contentUrl,
        theme: themeId,
        highlight: "solarized-light",
        macStyle: true,
        footnote: true,
        server: globalStates.serverUrl,
        apiKey: globalStates.apiKey,
        clientVersion,
        disableStdin: true,
    };
    if(globalStates.isClientMode) {
        mediaId = await renderAndPublishToServer(content, publishOptions, getInputContent);
    } else {
        mediaId = await renderAndPublish(content, publishOptions, getInputContent);
    }

    return buildMcpResponse(
        `Your article was successfully published to '公众号草稿箱'. The media ID is ${mediaId}.`,
    );
}
