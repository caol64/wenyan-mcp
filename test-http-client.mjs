import http from 'node:http';
import { EventEmitter } from 'node:events';

// Simple SSE client
class SimpleSSEClient extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.sessionId = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const req = http.request(this.url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        // Parse sessionId from headers or first event?
        // The server sets transport.sessionId, but we need to extract from events
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          // Process SSE lines
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.substring(5).trim();
              if (data) {
                try {
                  const json = JSON.parse(data);
                  if (json.sessionId) {
                    this.sessionId = json.sessionId;
                    console.log('Got sessionId:', this.sessionId);
                    resolve(this.sessionId);
                  }
                } catch (e) {}
              }
            }
          }
        });
        res.on('end', () => this.emit('close'));
        res.on('error', (err) => this.emit('error', err));
      });
      req.on('error', reject);
      req.end();
    });
  }

  sendMessage(data) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:3000/message?sessionId=${this.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(data));
      req.end();
    });
  }
}

async function test() {
  const client = new SimpleSSEClient('http://localhost:3000/sse');
  const sessionId = await client.connect();
  console.log('Connected with sessionId:', sessionId);

  // Send listTools request
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  const response = await client.sendMessage(request);
  console.log('List tools response:', JSON.stringify(response, null, 2));

  // Send list_themes tool call
  const toolCall = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'list_themes',
      arguments: {}
    }
  };
  const toolResponse = await client.sendMessage(toolCall);
  console.log('List themes response:', JSON.stringify(toolResponse, null, 2));

  console.log('Test completed successfully');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});