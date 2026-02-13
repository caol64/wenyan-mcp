import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function test() {
    const url = 'http://localhost:3001/sse';
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
    console.log('Tools:', tools);

    // Call list_themes
    const result = await client.callTool({
        name: 'list_themes',
        arguments: {},
    });
    console.log('Result:', result);

    await client.close();
    console.log('Test passed');
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});