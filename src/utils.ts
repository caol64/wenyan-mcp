import path from "node:path";
import fs from "node:fs/promises";
import { getNormalizeFilePath } from "@wenyan-md/core/wrapper";

export function buildMcpResponse(content: string) {
    return {
        content: [
            {
                type: "text",
                text: content,
            },
        ],
    };
}

class GlobalStates {
    private _isClientMode = false;
    private _serverUrl?: string;
    private _apiKey?: string;

    get isClientMode() {
        return this._isClientMode;
    }

    set isClientMode(value: boolean) {
        this._isClientMode = value;
    }

    get serverUrl() {
        return this._serverUrl;
    }

    set serverUrl(value: string | undefined) {
        this._serverUrl = value;
    }

    get apiKey() {
        return this._apiKey;
    }

    set apiKey(value: string | undefined) {
        this._apiKey = value;
    }
}

export const globalStates = new GlobalStates();

export async function getInputContent(
    inputContent?: string,
    file?: string,
): Promise<{ content: string; absoluteDirPath: string | undefined }> {
    let absoluteDirPath: string | undefined = undefined;

    // 2. 尝试从文件读取
    if (!inputContent && file) {
        const normalizePath = getNormalizeFilePath(file);
        inputContent = await fs.readFile(normalizePath, "utf-8");
        absoluteDirPath = path.dirname(normalizePath);
    }

    // 3. 校验输入
    if (!inputContent) {
        throw new Error("missing input-content (no argument, no stdin, and no file).");
    }

    return { content: inputContent, absoluteDirPath };
}
