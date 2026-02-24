import fs from "node:fs/promises";
import path from "node:path";
import { fetchContent, getNormalizeFilePath, globalStates, log } from "./utils.js";
import { configStore, renderStyledContent } from "@wenyan-md/core/wrapper";
import { publishToDraft } from "@wenyan-md/core/publish";
import { UPLOAD_DIR } from "./upload.js";

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

export const PUBLISH_ARTICLE_SSE_SCHEMA = {
    name: "publish_article",
    description: "Format a Markdown article using a selected theme and publish it to '微信公众号'.",
    inputSchema: {
        type: "object",
        properties: {
            file_id: {
                type: "string",
                description:
                    "ID of a previously uploaded file (via /upload endpoint). Use this for large files to save tokens.",
            },
            content: {
                type: "string",
                description:
                    "The Markdown text to publish. REQUIRED if 'content_url', or 'file_id' is not provided. DO INCLUDE frontmatter if present.",
            },
            content_url: {
                type: "string",
                description:
                    "A URL (e.g. GitHub raw link) to a Markdown file. Preferred over 'content' for large files to save tokens.",
            },
            theme_id: {
                type: "string",
                description:
                    "ID of the theme to use (e.g., default, orangeheart, rainbow, lapis, pie, maize, purple, phycat).",
            },
            wechat_app_id: {
                type: "string",
                description: "WeChat Official Account AppID. Required for stateless mode.",
            },
            wechat_app_secret: {
                type: "string",
                description: "WeChat Official Account AppSecret. Required for stateless mode.",
            },
        },
    },
} as const;

export async function publishArticle(
    fileId: string,
    contentUrl: string,
    file: string,
    content: string,
    themeId: string,
    appId?: string,
    appSecret?: string,
) {
    let workingDir: string | undefined;
    let contentFinal: string | undefined;

    // Priority: file_id > content_url > content > file
    if (fileId) {
        if (!globalStates.isSSE) {
            throw new Error("file_id is only supported in SSE mode.");
        }
        // Handle temporary uploaded file
        const uploadPath = path.join(UPLOAD_DIR, fileId);
        try {
            contentFinal = await fs.readFile(uploadPath, "utf-8");
        } catch (e) {
            log("error", `Failed to read uploaded file with ID: ${fileId}`, e);
            throw new Error(`Invalid or expired file_id: ${fileId}`);
        }
    } else if (contentUrl) {
        contentFinal = await fetchContent(contentUrl);
    } else if (!content && file) {
        // Legacy file path support
        if (globalStates.isSSE) {
            throw new Error("Local file paths are not supported in SSE mode. Please upload the file and use file_id.");
        }
        try {
            const normalizePath = getNormalizeFilePath(file);
            contentFinal = await fs.readFile(normalizePath, "utf-8");
            workingDir = path.dirname(normalizePath);
        } catch (e) {
            log("error", `Failed to read local file: ${file}`, e);
            throw new Error(`Cannot read local file '${file}'.`);
        }
    } else if (content) {
        contentFinal = content;
    }

    if (!contentFinal) {
        throw new Error("You must provide 'content', 'content_url', 'file_id', or a valid local 'file'.");
    }

    const processedContent = resolveAssetPaths(contentFinal);

    // Render and Publish
    const customTheme = configStore.getThemeById(themeId);

    const gzhContent = await renderStyledContent(processedContent, {
        themeId,
        hlThemeId: "solarized-light",
        isMacStyle: true,
        isAddFootnote: true,
        themeCss: customTheme,
    });

    if (!gzhContent.title) {
        throw new Error("Can't extract a valid title from the frontmatter.");
    }
    if (!gzhContent.cover) {
        throw new Error("Can't extract a valid cover from the frontmatter or article.");
    }

    // Pass dynamic config to publishToDraft
    const response = await publishToDraft(gzhContent.title, gzhContent.content, gzhContent.cover, {
        relativePath: workingDir,
        appId: appId,
        appSecret: appSecret,
    });

    return {
        content: [
            {
                type: "text",
                text: `Your article was successfully published to '公众号草稿箱'. The media ID is ${response.media_id}.`,
            },
        ],
    };
}

function resolveAssetPaths(markdown: string): string {
    // 匹配 pattern: ](asset://xxxxx)
    // 这里的 asset:// 后面紧跟的就是 file_id
    return markdown.replace(/\]\(asset:\/\/([^\)]+)\)/g, (match, fileId) => {
        const absolutePath = path.join(UPLOAD_DIR, fileId);
        // 返回绝对路径，wenyan-md 渲染器通常能处理本地绝对路径
        return `](${absolutePath})`;
    });
}
