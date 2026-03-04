#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./mcpServer.js";
import { globalStates } from "./utils.js";

/**
 * Start the server using stdio transport.
 */
async function mainStdio() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[Init] Wenyan MCP server started successfully and listening for requests...");
}

/**
 * Main entry point: parse command line arguments and start appropriate transport.
 */
async function main() {
    const args = process.argv.slice(2);
    const isClientMode = args.includes("--server");

    if (isClientMode) {
        globalStates.isClientMode = true;
        console.error("[Init] Starting Wenyan MCP server in remote client mode...");

        const serverIndex = args.indexOf("--server");
        if (serverIndex !== -1 && args[serverIndex + 1] && !args[serverIndex + 1].startsWith("--")) {
            globalStates.serverUrl = args[serverIndex + 1];
        }

        const apiKeyIndex = args.indexOf("--api-key");
        if (apiKeyIndex !== -1 && args[apiKeyIndex + 1] && !args[apiKeyIndex + 1].startsWith("--")) {
            globalStates.apiKey = args[apiKeyIndex + 1];
        }
    } else {
        console.error("[Init] Starting Wenyan MCP server in local mode...");
    }

    await mainStdio();
}

// ==========================================
// 全局异常与信号处理 (Graceful Shutdown)
// ==========================================
main().catch((error) => {
    // 必须使用 console.error 输出到 stderr，防止污染 MCP 的 JSON-RPC stdout 通道
    console.error("[Fatal Error] Server initialization failed:", error.message);
    process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
    console.error("[Unhandled Rejection] An unexpected error occurred:", reason?.message || reason);
    // 注意：在 MCP 中通常不建议直接 exit，记录日志即可，让 Host 决定是否重启
});

process.on("uncaughtException", (error: Error) => {
    console.error("[Uncaught Exception] Critical error:", error.message);
    process.exit(1);
});

// 3. 优雅退出
process.on("SIGINT", () => {
    console.error("[Shutdown] Received SIGINT, exiting...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.error("[Shutdown] Received SIGTERM, exiting...");
    process.exit(0);
});
