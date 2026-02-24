import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

/**
 * 路径标准化工具函数
 * 将 Windows 的反斜杠 \ 转换为正斜杠 /，并去除末尾斜杠
 * 目的：在 Linux 容器内也能正确处理 Windows 路径字符串
 */
function normalizePath(p: string): string {
    return p.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function getNormalizeFilePath(inputPath: string): string {
    const isContainer = !!process.env.CONTAINERIZED;
    if (isContainer) {
        const hostFilePath = normalizePath(process.env.HOST_FILE_PATH || "");
        const containerFilePath = normalizePath(process.env.CONTAINER_FILE_PATH || "/mnt/host-downloads");
        let relativePart = normalizePath(inputPath);
        if (relativePart.startsWith(hostFilePath)) {
            relativePart = relativePart.slice(hostFilePath.length);
        }

        if (!relativePart.startsWith("/")) {
            relativePart = "/" + relativePart;
        }

        return containerFilePath + relativePart;
    } else {
        return path.resolve(inputPath);
    }
}

/**
 * Structured logging
 */
export function log(level: "debug" | "info" | "warn" | "error", message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...(data && { data }) };
    console.error(JSON.stringify(logEntry));
}

/**
 * Helper to fetch content from URL
 */
export async function fetchContent(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch content from ${url}: ${response.statusText}`);
    }
    return response.text();
}

/**
 * Helper to process uploaded images
 */
export async function processImages(images: Array<{ name: string; content_base64: string }>): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wenyan-mcp-"));
    for (const img of images) {
        const buffer = Buffer.from(img.content_base64, "base64");
        const safeName = path.basename(img.name); // Prevent directory traversal
        await fs.writeFile(path.join(tempDir, safeName), buffer);
    }
    return tempDir;
}

class GlobalStates {
    private _isSSE = false;

    get isSSE() {
        return this._isSSE;
    }

    set isSSE(value: boolean) {
        this._isSSE = value;
    }
}

export const globalStates = new GlobalStates();
