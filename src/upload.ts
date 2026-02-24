import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { IncomingMessage } from "node:http";
import formidable from "formidable";
import { v4 as uuidv4 } from "uuid";

/**
 * Temporary file storage configuration
 */
const UPLOAD_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const UPLOAD_DIR = path.join(os.tmpdir(), "wenyan-mcp-uploads");

export interface UploadResult {
    file_id: string;
    expires_in: number;
    message: string;
}

export async function initUploadSystem() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        console.log(`Upload directory initialized at: ${UPLOAD_DIR}`);

        setInterval(cleanupOldUploads, UPLOAD_TTL_MS).unref();
    } catch (err) {
        console.error("Failed to create upload dir:", err);
    }
}

async function cleanupOldUploads() {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const now = Date.now();
        for (const file of files) {
            const filePath = path.join(UPLOAD_DIR, file);
            try {
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs > UPLOAD_TTL_MS) {
                    await fs.unlink(filePath);
                    // console.debug(`Cleaned up expired file: ${file}`);
                }
            } catch (e) {
                // 忽略单个文件处理错误（如文件刚被删除）
            }
        }
    } catch (e) {
        console.error("Cleanup task error:", e);
    }
}

export function handleUploadRequest(req: IncomingMessage): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        const form = formidable({
            uploadDir: UPLOAD_DIR,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            filename: (name, ext, part, form) => {
                // 生成文件名：UUID + 原始后缀
                return uuidv4() + path.extname(part.originalFilename || "");
            },
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                return reject(new Error(`Upload failed: ${String(err)}`));
            }

            // 获取第一个文件
            const fileKeys = Object.keys(files);
            if (fileKeys.length === 0) {
                return reject(new Error("No file uploaded"));
            }

            const firstFileKey = fileKeys[0];
            const fileValue = files[firstFileKey];
            const firstFile = Array.isArray(fileValue) ? fileValue[0] : fileValue;

            if (!firstFile) {
                return reject(new Error("File object is missing"));
            }

            resolve({
                file_id: firstFile.newFilename,
                expires_in: UPLOAD_TTL_MS / 1000,
                message: "File uploaded successfully. Use file_id in publish_article tool.",
            });
        });
    });
}

export async function saveBase64Image(filename: string, base64Data: string): Promise<UploadResult> {
    // 1. 去掉可能存在的 Data URI 前缀 (e.g. "data:image/png;base64,")
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");

    // 2. 生成存储路径
    const ext = path.extname(filename) || ".png"; // 默认给个 png
    const fileId = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileId);

    // 3. 写入文件
    const buffer = Buffer.from(base64Content, 'base64');
    await fs.writeFile(filePath, buffer);

    return {
        file_id: fileId,
        expires_in: UPLOAD_TTL_MS / 1000,
        message: "Image uploaded. Use 'asset://' + file_id in your markdown.",
    };
}

export const UPLOAD_ASSET_SCHEMA = {
    name: "upload_asset",
    description: `
Upload an image file via Base64 encoding.
REQUIRED when referencing local images in SSE mode.
Process:
1. Read the local image file.
2. Call this tool with the filename and base64 content.
3. Replace the image path in your Markdown with 'asset://{file_id}'.
`,
    inputSchema: {
        type: "object",
        properties: {
            filename: {
                type: "string",
                description: "Original filename (e.g., 'screenshot.png')",
            },
            base64: {
                type: "string",
                description: "Base64 encoded content of the image.",
            },
        },
        required: ["filename", "base64"],
    },
} as const;
