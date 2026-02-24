import { EventSource } from 'eventsource';
global.EventSource = EventSource;
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function test() {
    const url = 'http://localhost:3000/sse';
    console.log('Connecting to', url);
    const transport = new SSEClientTransport(url);
    const client = new Client(
        {
            name: 'test-client',
            version: '1.0.0',
        },
        {
            capabilities: {},
        },
    );
    await client.connect(transport);
    console.log('Connected');

    // List tools
    const tools = await client.listTools();
    console.log('Tools:', JSON.stringify(tools, null, 2));

    // Call list_themes (safe, no actual publish)
    const result = await client.callTool({
        name: 'list_themes',
        arguments: {},
    });
    console.log('List themes result:', JSON.stringify(result, null, 2));

    await client.close();
    console.log('Test passed');
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});