import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

// --- ESM boilerplate for __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFilePath = path.join(__dirname, ".env.test");
const baseCommand = "pnpx @modelcontextprotocol/inspector";
const envArgs = [];

if (fs.existsSync(envFilePath)) {
    console.log(`正在从 ${envFilePath} 加载环境变量...`);

    const fileContent = fs.readFileSync(envFilePath, "utf-8");
    const lines = fileContent.split("\n");

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
            envArgs.push(`-e ${JSON.stringify(trimmedLine)}`);
        }
    }
} else {
    console.log(`提示：.env.test 文件未找到，将不注入任何环境变量。`);
}

const finalCommand = `${baseCommand} ${envArgs.join(" ")}`.trim();

console.log(`即将执行: ${finalCommand}`);

const child = exec(finalCommand, (error) => {
    if (error) {
        console.error(`执行出错: ${error}`);
        return;
    }
});

// Pipe the output of the child process to the main process
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
