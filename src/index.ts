#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { configStore, renderStyledContent } from "@wenyan-md/core/wrapper";
import { publishToDraft } from "@wenyan-md/core/publish";
import { getNormalizeFilePath } from "./utils.js";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import url from "node:url";
import { listThemes, REGISTER_THEME_SCHEMA, registerTheme, REMOVE_THEME_SCHEMA, removeTheme } from "./theme.js";

/**
 * HTTP server configuration
 */
interface HttpServerConfig {
  port: number;
  corsOrigin?: string;
  apiKey?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Get configuration from environment variables
 */
function getHttpConfig(port: number): HttpServerConfig {
  return {
    port,
    corsOrigin: process.env.HTTP_CORS_ORIGIN || '*',
    apiKey: process.env.HTTP_API_KEY,
    logLevel: (process.env.HTTP_LOG_LEVEL as any) || 'info',
  };
}

/**
 * Structured logging
 */
function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...(data && { data }) };
  console.error(JSON.stringify(logEntry));
}

/**
 * Create and configure an MCP server instance.
 */
function createServer(): Server {
    const server = new Server(
        {
            name: "wenyan-mcp",
            version: "2.0.0",
        },
        {
            capabilities: {
                resources: {},
                tools: {},
                prompts: {},
                // logging: {},
            },
        },
    );

    /**
     * Handler that lists available tools.
     * Exposes a single "publish_article" tool that lets clients publish new article.
     */
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "publish_article",
                    description: "Format a Markdown article using a selected theme and publish it to '微信公众号'.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            content: {
                                type: "string",
                                description:
                                    "The Markdown text to publish. REQUIRED if 'file' is not provided. Preserves frontmatter if present.",
                            },
                            file: {
                                type: "string",
                                description:
                                    "The path to the Markdown file (absolute or relative). REQUIRED if 'content' is not provided.",
                            },
                            theme_id: {
                                type: "string",
                                description:
                                    "ID of the theme to use (e.g., default, orangeheart, rainbow, lapis, pie, maize, purple, phycat).",
                            },
                        },
                    },
                },
                {
                    name: "list_themes",
                    description:
                        "List the themes compatible with the 'publish_article' tool to publish an article to '微信公众号'.",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                REGISTER_THEME_SCHEMA,
                REMOVE_THEME_SCHEMA,
            ],
        };
    });

    /**
     * Handler for the publish_article tool.
     * Publish a new article with the provided title and content, and returns success message.
     */
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === "publish_article") {
            // server.sendLoggingMessage({
            //     level: "debug",
            //     data: JSON.stringify(request.params.arguments),
            // });
            const contentArg = request.params.arguments?.content;
            const fileArg = request.params.arguments?.file;
            if (!contentArg && !fileArg) {
                throw new Error("You must provide either 'content' or 'file' to publish an article.");
            }
            let content = String(contentArg || "");
            const file = String(fileArg || "");
            const themeId = String(request.params.arguments?.theme_id || "");
            // 先尝试从已注册的主题中获取主题
            const customTheme = configStore.getThemeById(themeId);
            let absoluteDirPath: string | undefined;
            if (!content && file) {
                const normalizePath = getNormalizeFilePath(file);
                content = await fs.readFile(normalizePath, "utf-8");
                if (!content) {
                    throw new Error("Can't read content from the specified file.");
                }
                absoluteDirPath = path.dirname(normalizePath);
            }
            const gzhContent = await renderStyledContent(content, {
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
            const response = await publishToDraft(gzhContent.title, gzhContent.content, gzhContent.cover, {
                relativePath: absoluteDirPath,
            });

            return {
                content: [
                    {
                        type: "text",
                        text: `Your article was successfully published to '公众号草稿箱'. The media ID is ${response.media_id}.`,
                    },
                ],
            };
        } else if (request.params.name === "list_themes") {
            return listThemes();
        } else if (request.params.name === "register_theme") {
            return await registerTheme(
                String(request.params.arguments?.name || ""),
                String(request.params.arguments?.path || ""),
            );
        } else if (request.params.name === "remove_theme") {
            return removeTheme(String(request.params.arguments?.name || ""));
        }

        throw new Error("Unknown tool");
    });

    return server;
}

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
 * Start an HTTP server with SSE transport on the given port.
 */
async function mainHttp(port: number) {
    const config = getHttpConfig(port);
    const httpServer = http.createServer();

    // Map sessionId to transport
    const transports = new Map<string, SSEServerTransport>();

    // Request logging middleware
    function logRequest(req: http.IncomingMessage, res: http.ServerResponse, startTime: number) {
        const duration = Date.now() - startTime;
        log('info', 'HTTP request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            durationMs: duration,
            userAgent: req.headers['user-agent'],
        });
    }

    // CORS headers with configurable origin
    function setCorsHeaders(res: http.ServerResponse) {
        res.setHeader('Access-Control-Allow-Origin', config.corsOrigin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    }

    // API key authentication middleware
    function authenticate(req: http.IncomingMessage): boolean {
        if (!config.apiKey) {
            return true; // No API key required
        }
        const apiKey = req.headers['x-api-key'];
        return apiKey === config.apiKey;
    }

    // Global error handler for HTTP requests
    function handleError(res: http.ServerResponse, statusCode: number, message: string, error?: any) {
        log('error', 'HTTP error', { statusCode, message, error: error?.message || error });
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: message,
            ...(config.logLevel === 'debug' && error && { detail: error.message })
        }));
    }

    httpServer.on('request', async (req, res) => {
        const startTime = Date.now();
        // Set CORS headers
        setCorsHeaders(res);

        // Handle OPTIONS preflight requests
        if (req.method === 'OPTIONS') {
            res.writeHead(204).end();
            logRequest(req, res, startTime);
            return;
        }

        // Authenticate requests (except health and root)
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;
        if (!['/health', '/'].includes(pathname || '')) {
            if (!authenticate(req)) {
                handleError(res, 401, 'Unauthorized: Invalid or missing API key');
                logRequest(req, res, startTime);
                return;
            }
        }

        // Root endpoint
        if (req.method === 'GET' && pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                name: 'wenyan-mcp',
                version: '2.0.0',
                endpoints: {
                    sse: '/sse',
                    message: '/message',
                    health: '/health',
                    root: '/'
                },
                documentation: 'https://github.com/caol64/wenyan-mcp',
                httpMode: true,
                features: {
                    authentication: !!config.apiKey,
                    cors: config.corsOrigin !== '*',
                    logLevel: config.logLevel
                }
            }));
            logRequest(req, res, startTime);
            return;
        }

        // Health check with additional info
        if (req.method === 'GET' && pathname === '/health') {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '2.0.0',
                services: {
                    wechat_api: 'unknown' // Can be enhanced to check WeChat API connectivity
                }
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(health));
            logRequest(req, res, startTime);
            return;
        }

        // SSE connection endpoint
        if (req.method === 'GET' && pathname === '/sse') {
            try {
                // Create a new SSE transport for this connection
                const transport = new SSEServerTransport('/message', res);
                const sessionId = transport.sessionId;
                transports.set(sessionId, transport);

                // Create a new server instance for this connection
                const server = createServer();
                await server.connect(transport);
                // The transport.start() is called by connect() automatically

                // Clean up when the connection closes
                transport.onclose = () => {
                    transports.delete(sessionId);
                    log('debug', 'SSE connection closed', { sessionId });
                };
                
                log('info', 'SSE connection established', { sessionId });
                logRequest(req, res, startTime);
            } catch (error) {
                handleError(res, 500, 'Failed to establish SSE connection', error);
                logRequest(req, res, startTime);
            }
            return;
        }

        // POST message endpoint
        if (req.method === 'POST' && pathname === '/message') {
            const sessionId = parsedUrl.query.sessionId as string;
            const transport = transports.get(sessionId);
            if (!transport) {
                handleError(res, 404, 'Session not found');
                logRequest(req, res, startTime);
                return;
            }
            try {
                await transport.handlePostMessage(req, res);
                logRequest(req, res, startTime);
            } catch (error) {
                handleError(res, 500, 'Internal server error', error);
                logRequest(req, res, startTime);
            }
            return;
        }

        // Not found
        handleError(res, 404, 'Endpoint not found', { path: pathname });
        logRequest(req, res, startTime);
    });

    httpServer.listen(config.port, () => {
        log('info', 'Wenyan MCP HTTP server started', {
            port: config.port,
            corsOrigin: config.corsOrigin,
            authentication: config.apiKey ? 'enabled' : 'disabled',
            logLevel: config.logLevel
        });
        console.error(`Wenyan MCP server listening on http://0.0.0.0:${config.port}`);
        console.error('SSE endpoint: GET /sse');
        console.error('Message endpoint: POST /message?sessionId=...');
        console.error('Health check: GET /health');
        console.error('Root info: GET /');
        if (config.apiKey) {
            console.error('API key authentication: REQUIRED (X-API-Key header)');
        }
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        log('info', 'Shutting down HTTP server');
        httpServer.close();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        log('info', 'Shutting down HTTP server');
        httpServer.close();
        process.exit(0);
    });
}

/**
 * Main entry point: parse command line arguments and start appropriate transport.
 */
async function main() {
    const args = process.argv.slice(2);
    const httpIndex = args.indexOf('--http-port');
    if (httpIndex !== -1) {
        const port = parseInt(args[httpIndex + 1], 10);
        if (isNaN(port) || port < 1 || port > 65535) {
            console.error('Invalid port number');
            process.exit(1);
        }
        await mainHttp(port);
    } else {
        await mainStdio();
    }
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});