import http from "node:http";
import https from "node:https";
import fs from "node:fs/promises";
import url from "node:url";
import { log } from "node:console";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./mcpServer.js";
import { handleUploadRequest } from "./upload.js";
import { globalStates } from "./utils.js";

/**
 * HTTP server configuration
 */
interface HttpServerConfig {
    port: number;
    corsOrigin?: string;
    apiKey?: string;
    logLevel: "debug" | "info" | "warn" | "error";
    enableHttps: boolean;
    sslKey?: string;
    sslCert?: string;
}

/**
 * Get configuration from environment variables and args
 */
function getHttpConfig(port: number, enableHttps: boolean): HttpServerConfig {
    return {
        port,
        corsOrigin: process.env.HTTP_CORS_ORIGIN || "*",
        apiKey: process.env.HTTP_API_KEY,
        logLevel: (process.env.HTTP_LOG_LEVEL as any) || "info",
        enableHttps,
        sslKey: process.env.SSL_KEY_PATH,
        sslCert: process.env.SSL_CERT_PATH,
    };
}

/**
 * Start an HTTP server with SSE transport on the given port.
 */
export async function mainHttp(port: number, enableHttps: boolean) {
    globalStates.isSSE = true;
    const config = getHttpConfig(port, enableHttps);

    let httpServer: http.Server | https.Server;

    if (config.enableHttps && config.sslKey && config.sslCert) {
        try {
            const key = await fs.readFile(config.sslKey);
            const cert = await fs.readFile(config.sslCert);
            httpServer = https.createServer({ key, cert });
            log("info", "HTTPS enabled with provided certificate");
        } catch (e) {
            console.error("Failed to load SSL certs:", e);
            process.exit(1);
        }
    } else {
        httpServer = http.createServer();
        if (config.enableHttps) {
            log("warn", "HTTPS flag enabled but no certs provided. Running in HTTP mode (behind proxy expected).");
        }
    }

    // Map sessionId to transport
    const transports = new Map<string, SSEServerTransport>();

    // Request logging middleware
    function logRequest(req: http.IncomingMessage, res: http.ServerResponse, startTime: number) {
        const duration = Date.now() - startTime;
        log("info", "HTTP request", {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            durationMs: duration,
        });
    }

    // CORS headers
    function setCorsHeaders(res: http.ServerResponse) {
        res.setHeader("Access-Control-Allow-Origin", config.corsOrigin || "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
    }

    // API key authentication
    function authenticate(req: http.IncomingMessage): boolean {
        if (!config.apiKey) return true;
        return req.headers["x-api-key"] === config.apiKey;
    }

    httpServer.on("request", async (req, res) => {
        const startTime = Date.now();
        setCorsHeaders(res);

        if (req.method === "OPTIONS") {
            res.writeHead(204).end();
            return;
        }

        const parsedUrl = url.parse(req.url || "", true);
        const pathname = parsedUrl.pathname;

        // Public endpoints: Health, Root
        if (!["/health", "/"].includes(pathname || "")) {
            if (!authenticate(req)) {
                res.writeHead(401).end(JSON.stringify({ error: "Unauthorized" }));
                logRequest(req, res, startTime);
                return;
            }
        }

        // Upload Endpoint
        if (req.method === "POST" && pathname === "/upload") {
            try {
                const result = await handleUploadRequest(req);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
            } catch (error: any) {
                const statusCode = error.message === "No file uploaded" ? 400 : 500;
                res.writeHead(statusCode, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: error.message || "Upload failed" }));
            }
            logRequest(req, res, startTime);
            return;
        }

        // Root endpoint
        if (req.method === "GET" && pathname === "/") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    name: "wenyan-mcp",
                    version: "2.0.1",
                    endpoints: {
                        sse: "/sse",
                        message: "/message",
                        upload: "/upload",
                        health: "/health",
                    },
                    config: {
                        https: !!config.enableHttps,
                    },
                }),
            );
            return;
        }

        // SSE connection
        if (req.method === "GET" && pathname === "/sse") {
            try {
                const transport = new SSEServerTransport("/message", res);
                const sessionId = transport.sessionId;
                transports.set(sessionId, transport);
                const server = createServer();
                await server.connect(transport);
                transport.onclose = () => transports.delete(sessionId);
            } catch (error) {
                console.error("SSE Init Error:", error);
                if (!res.headersSent) {
                    res.writeHead(500).end(JSON.stringify({ error: "SSE Init Failed" }));
                }
            }
            return;
        }

        // Message
        if (req.method === "POST" && pathname === "/message") {
            const sessionId = parsedUrl.query.sessionId as string;
            const transport = transports.get(sessionId);
            if (!transport) {
                res.writeHead(404).end(JSON.stringify({ error: "Session not found or expired" }));
                return;
            }
            await transport.handlePostMessage(req, res);
            return;
        }

        // Health
        if (req.method === "GET" && pathname === "/health") {
            res.writeHead(200).end(JSON.stringify({ status: "ok" }));
            return;
        }

        res.writeHead(404).end("Not Found");
        logRequest(req, res, startTime);
    });

    httpServer.listen(config.port, () => {
        console.error(
            `Wenyan MCP server listening on ${config.enableHttps && config.sslKey ? "https" : "http"}://0.0.0.0:${config.port}`,
        );
    });
}
