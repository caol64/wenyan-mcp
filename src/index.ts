#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mainHttp } from "./httpServer.js";
import { createServer } from "./mcpServer.js";

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function mainStdio() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Wenyan MCP server running on stdio");
}

/**
 * Main entry point: parse command line arguments and start appropriate transport.
 */
async function main() {
    const args = process.argv.slice(2);
    const isSseMode = args.includes("--sse");
    if (isSseMode) {
        const httpIndex = args.indexOf("--http-port");
        let port = 3000; // 默认值

        if (httpIndex !== -1 && args[httpIndex + 1]) {
            const parsedPort = parseInt(args[httpIndex + 1], 10);
            if (!isNaN(parsedPort)) {
                port = parsedPort;
            }
        }

        const useHttps = args.includes("--https");

        console.error(`Starting SSE server on port ${port}...`);
        await mainHttp(port, useHttps);
    } else {
        await mainStdio();
    }
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
