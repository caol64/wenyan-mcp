import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const LLM_API_KEY = process.env.LLM_API_KEY;
if (!LLM_API_KEY) {
    throw new Error("LLM_API_KEY is not set");
}

const LLM_BASE_URL = process.env.LLM_BASE_URL;
if (!LLM_BASE_URL) {
    throw new Error("LLM_BASE_URL is not set");
}

const LLM_MODEL = process.env.LLM_MODEL;
if (!LLM_MODEL) {
    throw new Error("LLM_MODEL is not set");
}

async function runMcp() {
    // const transport = new StdioClientTransport({
    //     command: "docker",
    //     args: ["run", "--rm", "-i", "caol64/wenyan-mcp"],
    // });
    const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
    });

    const client = new Client(
        {
            name: "wenyan-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        const mcpResponse = await client.listTools();
        const availableTools = mcpResponse.tools.map((t) => ({
            name: t.name,
            description: t.description || "",
            parameters: t.inputSchema,
        }));

        // console.log("Available Tools:", JSON.stringify(availableTools, null, 2));
        const openaiTools = availableTools.map((tool) => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }));

        const llmClient = new OpenAI({ apiKey: LLM_API_KEY, baseURL: LLM_BASE_URL });
        const userPrompt = { role: "user", content: "目前你可以使用哪些公众号主题" };
        const response = await llmClient.chat.completions.create({
            model: LLM_MODEL,
            messages: [userPrompt],
            tools: openaiTools,
            tool_choice: "auto",
        });

        const assistantMessage = response.choices[0].message;

        if (assistantMessage.tool_calls) {
            // const toolCall = assistantMessage.tool_calls[0];
            // console.log("模型决定调用工具:", toolCall.function.name);

            for (const toolCall of assistantMessage.tool_calls) {
                const name = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);

                // 调用 MCP 客户端执行真实工具逻辑
                const result = await client.callTool({
                    name: name,
                    arguments: args,
                });

                // console.log("工具执行结果:", result.content);

                const toolContent = result.content.map((item) => item.text).join("\n");
                const finalMessages = [
                    userPrompt,
                    assistantMessage,
                    {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: toolContent,
                    },
                ];
                const finalResponse = await llmClient.chat.completions.create({
                    model: LLM_MODEL,
                    messages: finalMessages,
                });

                console.log(finalResponse.choices[0].message.content);
            }
        } else {
            console.log("AI 回复:", assistantMessage.content);
        }
    } catch (error) {
        console.error("MCP Client Error:", error);
    } finally {
        await transport.close();
    }
}

runMcp();
