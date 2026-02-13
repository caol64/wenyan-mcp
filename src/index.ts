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
import https from "node:https";
import url from "node:url";
import os from "node:os";
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import { listThemes, REGISTER_THEME_SCHEMA, registerTheme, REMOVE_THEME_SCHEMA, removeTheme } from "./theme.js";

/**
 * HTTP server configuration
 */
interface HttpServerConfig {
  port: number;
  corsOrigin?: string;
  apiKey?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableHttps: boolean;
  sslKey?: string;
  sslCert?: string;
  allowLocalFiles: boolean; // Control if local file paths are allowed
}

/**
 * Get configuration from environment variables and args
 */
function getHttpConfig(port: number, enableHttps: boolean, allowLocalFiles: boolean): HttpServerConfig {
  return {
    port,
    corsOrigin: process.env.HTTP_CORS_ORIGIN || '*',
    apiKey: process.env.HTTP_API_KEY,
    logLevel: (process.env.HTTP_LOG_LEVEL as any) || 'info',
    enableHttps,
    sslKey: process.env.SSL_KEY_PATH,
    sslCert: process.env.SSL_CERT_PATH,
    allowLocalFiles,
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
 * Helper to fetch content from URL
 */
async function fetchContent(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch content from ${url}: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Helper to process uploaded images
 */
async function processImages(images: Array<{ name: string; content_base64: string }>): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wenyan-mcp-'));
  for (const img of images) {
    const buffer = Buffer.from(img.content_base64, 'base64');
    const safeName = path.basename(img.name); // Prevent directory traversal
    await fs.writeFile(path.join(tempDir, safeName), buffer);
  }
  return tempDir;
}

/**
 * Temporary file storage configuration
 */
const UPLOAD_TTL_MS = 10 * 60 * 1000; // 10 minutes
const UPLOAD_DIR = path.join(os.tmpdir(), 'wenyan-mcp-uploads');

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(err => console.error("Failed to create upload dir:", err));

/**
 * Clean up old uploads
 */
async function cleanupOldUploads() {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const now = Date.now();
        for (const file of files) {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtimeMs > UPLOAD_TTL_MS) {
                await fs.unlink(filePath).catch(() => {});
            }
        }
    } catch (e) {
        // Ignore errors
    }
}
// Run cleanup every 10 minutes
setInterval(cleanupOldUploads, 10 * 60 * 1000).unref();

/**
 * Create and configure an MCP server instance.
 */
function createServer(allowLocalFiles: boolean): Server {
    const server = new Server(
        {
            name: "wenyan-mcp",
            version: "2.0.1",
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
                    description: "Format a Markdown article using a selected theme and publish it to '微信公众号'. Supports multiple input methods: local file (legacy), remote URL (preferred), or temporary file ID (secure upload).",
                    inputSchema: {
                        type: "object",
                        properties: {
                            file_id: {
                                type: "string",
                                description: "ID of a previously uploaded file (via /upload endpoint). Use this for large files to save tokens.",
                            },
                            content: {
                                type: "string",
                                description:
                                    "The Markdown text to publish. REQUIRED if 'file', 'content_url', or 'file_id' is not provided.",
                            },
                            content_url: {
                                type: "string",
                                description:
                                    "URL to a Markdown file (e.g. GitHub raw link). Preferred over 'content' for large files to save tokens.",
                            },
                            file: {
                                type: "string",
                                description:
                                    "The local path to the Markdown file. Only available if server is configured with --allow-local-files.",
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
                            images: {
                                type: "array",
                                description: "List of images to upload if article references local files. Useful when HOST_FILE_PATH is not available.",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string", description: "Filename referenced in markdown (e.g. 'image.png')" },
                                        content_base64: { type: "string", description: "Base64 encoded image content" }
                                    },
                                    required: ["name", "content_base64"]
                                }
                            }
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
            const args = request.params.arguments || {};
            
            // 1. Resolve Configuration (Stateless support)
            const appId = (args.wechat_app_id as string) || process.env.WECHAT_APP_ID;
            const appSecret = (args.wechat_app_secret as string) || process.env.WECHAT_APP_SECRET;

            if (!appId || !appSecret) {
                throw new Error("Missing WeChat AppID or AppSecret. Please provide them via arguments (stateless mode) or server environment variables.");
            }

            // 2. Resolve Content
            let content = String(args.content || "");
            const contentUrl = String(args.content_url || "");
            const file = String(args.file || "");
            const fileId = String(args.file_id || "");
            const themeId = String(args.theme_id || "");
            const images = args.images as Array<{ name: string; content_base64: string }> | undefined;

            let workingDir: string | undefined;
            let tempDir: string | undefined;

            try {
                // Priority: file_id > content_url > content > file
                if (fileId) {
                    // Validate fileId to prevent directory traversal
                    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileId)) {
                        throw new Error("Invalid file_id format. Must be a valid UUID.");
                    }
                    
                    // Handle temporary uploaded file
                    const uploadPath = path.join(UPLOAD_DIR, fileId);
                    try {
                        content = await fs.readFile(uploadPath, "utf-8");
                        // For uploaded files, we treat the upload dir as working dir so relative images might work if also uploaded?
                        // Actually, single markdown file upload doesn't include images. Images must be passed via 'images' arg or embedded as base64.
                        log('info', `Read content from uploaded file ID: ${fileId}`);
                        // Optionally delete immediately? Or let TTL handle it. Let TTL handle it for retry scenarios.
                    } catch (e) {
                        throw new Error(`Invalid or expired file_id: ${fileId}`);
                    }
                } else if (contentUrl) {
                    log('info', `Fetching content from URL: ${contentUrl}`);
                    content = await fetchContent(contentUrl);
                } else if (!content && file) {
                    // Legacy file path support
                    if (!allowLocalFiles) {
                         throw new Error("Local file access is disabled on this server. Please use content_url or file upload (file_id).");
                    }
                    try {
                        const normalizePath = getNormalizeFilePath(file);
                        content = await fs.readFile(normalizePath, "utf-8");
                        workingDir = path.dirname(normalizePath);
                    } catch (e) {
                         throw new Error(`Cannot read local file '${file}'.`);
                    }
                }

                if (!content) {
                     throw new Error("You must provide 'content', 'content_url', 'file_id', or a valid local 'file'.");
                }

                // 3. Handle Images / Working Directory
                if (images && images.length > 0) {
                    tempDir = await processImages(images);
                    workingDir = tempDir; // Override working directory to temp dir containing images
                    log('info', `Processed ${images.length} images to temp dir: ${tempDir}`);
                } else if (!workingDir && process.env.HOST_FILE_PATH) {
                    // Fallback to HOST_FILE_PATH if available and no specific images provided
                    workingDir = process.env.HOST_FILE_PATH;
                }

                // 4. Render and Publish
                const customTheme = configStore.getThemeById(themeId);
                
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

                // Pass dynamic config to publishToDraft
                const response = await publishToDraft(gzhContent.title, gzhContent.content, gzhContent.cover, {
                    relativePath: workingDir,
                    appId: appId,
                    appSecret: appSecret
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Your article was successfully published to '公众号草稿箱'. The media ID is ${response.media_id}.`,
                        },
                    ],
                };

            } finally {
                // Cleanup temp dir
                if (tempDir) {
                    try {
                        await fs.rm(tempDir, { recursive: true, force: true });
                        log('debug', `Cleaned up temp dir: ${tempDir}`);
                    } catch (e) {
                        log('warn', `Failed to clean up temp dir: ${tempDir}`, e);
                    }
                }
            }

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
    const server = createServer(true); // Always allow local files in stdio mode
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Wenyan MCP server running on stdio");
}

/**
 * Start an HTTP server with SSE transport on the given port.
 */
async function mainHttp(port: number, enableHttps: boolean, allowLocalFiles: boolean) {
    const config = getHttpConfig(port, enableHttps, allowLocalFiles);
    
    let httpServer: http.Server | https.Server;
    
    if (config.enableHttps && config.sslKey && config.sslCert) {
        try {
            const key = await fs.readFile(config.sslKey);
            const cert = await fs.readFile(config.sslCert);
            httpServer = https.createServer({ key, cert });
            log('info', 'HTTPS enabled with provided certificate');
        } catch (e) {
            console.error("Failed to load SSL certs:", e);
            process.exit(1);
        }
    } else {
        httpServer = http.createServer();
        if (config.enableHttps) {
            log('warn', 'HTTPS flag enabled but no certs provided. Running in HTTP mode (behind proxy expected).');
        }
    }

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
        });
    }

    // CORS headers
    function setCorsHeaders(res: http.ServerResponse) {
        res.setHeader('Access-Control-Allow-Origin', config.corsOrigin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    }

    // API key authentication
    function authenticate(req: http.IncomingMessage): boolean {
        if (!config.apiKey) return true;
        return req.headers['x-api-key'] === config.apiKey;
    }

    httpServer.on('request', async (req, res) => {
        const startTime = Date.now();
        setCorsHeaders(res);

        if (req.method === 'OPTIONS') {
            res.writeHead(204).end();
            logRequest(req, res, startTime);
            return;
        }

        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;

        // Public endpoints: Health, Root
        if (!['/health', '/'].includes(pathname || '')) {
            if (!authenticate(req)) {
                res.writeHead(401).end(JSON.stringify({ error: 'Unauthorized' }));
                logRequest(req, res, startTime);
                return;
            }
        }

        // Upload Endpoint
        if (req.method === 'POST' && pathname === '/upload') {
            const form = formidable({
                uploadDir: UPLOAD_DIR,
                keepExtensions: true,
                maxFileSize: 10 * 1024 * 1024, // 10MB
                filename: (name, ext, part, form) => {
                    return uuidv4(); // Generate UUID as filename
                }
            });

            form.parse(req, (err, fields, files) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Upload failed', details: String(err) }));
                    return;
                }

                // Get the first file
                const fileKeys = Object.keys(files);
                if (fileKeys.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No file uploaded' }));
                    return;
                }

                const firstFileKey = fileKeys[0];
                const fileValue = files[firstFileKey];
                const firstFile: any = Array.isArray(fileValue) ? fileValue[0] : fileValue;

                if (!firstFile) {
                    res.writeHead(400).end(JSON.stringify({ error: 'File upload error' }));
                    return;
                }
                
                // filename is the UUID because of our custom filename function
                const fileId = firstFile.newFilename; 

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    file_id: fileId,
                    expires_in: UPLOAD_TTL_MS / 1000,
                    message: "File uploaded successfully. Use file_id in publish_article tool."
                }));
                logRequest(req, res, startTime);
            });
            return;
        }

        // Root endpoint
        if (req.method === 'GET' && pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                name: 'wenyan-mcp',
                version: '2.0.1',
                endpoints: {
                    sse: '/sse',
                    message: '/message',
                    upload: '/upload',
                    health: '/health',
                },
                config: {
                    https: !!config.enableHttps,
                    allowLocalFiles: config.allowLocalFiles
                }
            }));
            return;
        }

        // SSE connection
        if (req.method === 'GET' && pathname === '/sse') {
            try {
                const transport = new SSEServerTransport('/message', res);
                const sessionId = transport.sessionId;
                transports.set(sessionId, transport);
                const server = createServer(config.allowLocalFiles); // Pass local files config
                await server.connect(transport);
                transport.onclose = () => transports.delete(sessionId);
            } catch (error) {
                res.writeHead(500).end(JSON.stringify({ error: 'SSE Init Failed' }));
            }
            return;
        }

        // Message
        if (req.method === 'POST' && pathname === '/message') {
            const sessionId = parsedUrl.query.sessionId as string;
            const transport = transports.get(sessionId);
            if (!transport) {
                res.writeHead(404).end('Session not found');
                return;
            }
            await transport.handlePostMessage(req, res);
            return;
        }
        
        // Health
        if (req.method === 'GET' && pathname === '/health') {
             res.writeHead(200).end(JSON.stringify({ status: 'ok' }));
             return;
        }

        res.writeHead(404).end('Not Found');
    });

    httpServer.listen(config.port, () => {
        console.error(`Wenyan MCP server listening on ${config.enableHttps && config.sslKey ? 'https' : 'http'}://0.0.0.0:${config.port}`);
        if (config.allowLocalFiles) console.error("⚠️ Local file access ENABLED");
        else console.error("🔒 Local file access DISABLED (Stateless Mode)");
    });
}

/**
 * Main entry point: parse command line arguments and start appropriate transport.
 */
async function main() {
    const args = process.argv.slice(2);
    const httpIndex = args.indexOf('--http-port');
    const httpsIndex = args.indexOf('--https'); // Flag to enable https
    const allowLocalIndex = args.indexOf('--allow-local-files'); // Flag to allow local paths

    if (httpIndex !== -1) {
        const port = parseInt(args[httpIndex + 1], 10);
        await mainHttp(port, httpsIndex !== -1, allowLocalIndex !== -1);
    } else {
        // Stdio mode always allows local files as it's local
        const server = createServer(true);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Wenyan MCP server running on stdio");
    }
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});