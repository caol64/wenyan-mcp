import path from "node:path";

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
