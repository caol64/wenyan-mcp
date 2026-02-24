
import fs from 'node:fs';
import path from 'node:path';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function testUpload() {
    console.log('Testing /upload endpoint...');
    
    const tempFile = path.resolve('test-upload-content.md');
    fs.writeFileSync(tempFile, '# Hello World from Upload\nThis is a test.');

    try {
        const form = new FormData();
        form.append('file', await fileFromPath(tempFile));

        // Use standard fetch with formdata-node
        // Node 18+ has global fetch, but handling FormData might need specific headers or encoding
        // The 'formdata-node' package is good but 'fetch' expects native FormData or specific body.
        // Let's use 'form-data-encoder' logic or just simple boundary handling if needed,
        // but modern Node fetch can handle spec-compliant FormData.
        
        // Actually, let's use the 'form-data' package logic or simple http.request if fetch is finicky with boundaries in Node.
        // But let's try fetch first.
        
        const { Encoder } = await import('form-data-encoder');
        const encoder = new Encoder(form);
        
        const options = {
            method: 'POST',
            headers: encoder.headers,
            body:  globalThis.Readable.from(encoder)
        };

        const res = await fetch(`${BASE_URL}/upload`, options);
        
        if (!res.ok) {
            console.error('Upload failed:', res.status, await res.text());
            return;
        }

        const data = await res.json();
        console.log('Upload Success:', data);
        return data.file_id;

    } catch (e) {
        console.error('Test Error:', e);
    } finally {
        fs.unlinkSync(tempFile);
    }
}

testUpload();
