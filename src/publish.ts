import { renderAndPublish, renderAndPublishToServer } from "@wenyan-md/core/wrapper";
import { buildMcpResponse, getInputContent, globalStates } from "./utils.js";

export interface PublishArticleInput {
    contentUrl: string;
    file: string;
    content: string;
    themeId: string;
    appId?: string;
    clientVersion?: string;
    needOpenComment?: 0 | 1;
    onlyFansCanComment?: 0 | 1;
}

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
            app_id: {
                type: "string",
                description:
                    "AppID for the WeChat MP platform ('微信公众号').",
            },
            need_open_comment: {
                type: "integer",
                enum: [0, 1],
                description:
                    "Whether to enable comments on the draft. 1 enables comments; 0 disables them.",
            },
            only_fans_can_comment: {
                type: "integer",
                enum: [0, 1],
                description:
                    "Whether only followers can comment. This only takes effect when need_open_comment is 1.",
            },
        },
    },
} as const;

export function buildPublishOptions(input: PublishArticleInput) {
    return {
        file: input.file ? input.file : input.contentUrl,
        theme: input.themeId,
        highlight: "solarized-light",
        macStyle: true,
        footnote: true,
        server: globalStates.serverUrl,
        apiKey: globalStates.apiKey,
        clientVersion: input.clientVersion,
        disableStdin: true,
        appId: input.appId ? input.appId : undefined,
        need_open_comment: input.needOpenComment,
        only_fans_can_comment: input.needOpenComment === 1 ? input.onlyFansCanComment : undefined,
    };
}

export async function publishArticle(
    contentUrl: string,
    file: string,
    content: string,
    themeId: string,
    appId?: string,
    clientVersion?: string,
    needOpenComment?: 0 | 1,
    onlyFansCanComment?: 0 | 1,
) {
    let mediaId = "";
    const publishOptions = buildPublishOptions({
        contentUrl,
        file,
        content,
        themeId,
        appId,
        clientVersion,
        needOpenComment,
        onlyFansCanComment,
    });
    if(globalStates.isClientMode) {
        mediaId = await renderAndPublishToServer(content, publishOptions, getInputContent);
    } else {
        if (publishOptions.appId) {
            throw new Error("AppID is only supported in remote client mode. Please remove 'app_id' or run the server in remote client mode with --server <server_url>.");
        }
        mediaId = await renderAndPublish(content, publishOptions, getInputContent);
    }

    return buildMcpResponse(
        `Your article was successfully published to '公众号草稿箱'. The media ID is ${mediaId}.`,
    );
}
