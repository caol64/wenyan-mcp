import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFilePath = path.join(__dirname, ".env.test");

// 基础命令参数
const args = ["exec", "mcp-inspector"];

// 1. 手动解析 .env.test 并构造 Inspector 要求的 -e 参数
if (fs.existsSync(envFilePath)) {
    console.log(`正在从 ${envFilePath} 加载环境变量...`);

    const fileContent = fs.readFileSync(envFilePath, "utf-8");
    const lines = fileContent.split("\n");

    for (const line of lines) {
        const trimmedLine = line.trim();
        // 忽略空行和注释
        if (trimmedLine && !trimmedLine.startsWith("#")) {
            // 注意：spawn 接收的是参数数组，所以 "-e" 和 "KEY=VALUE" 是两个独立的元素
            args.push("-e", trimmedLine);
        }
    }
} else {
    console.log(`提示：.env.test 文件未找到，将不注入任何环境变量。`);
}

args.push("node", "./dist/index.js");

// 2. 兼容 Windows 与 Unix
const finalCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

console.log(`即将执行: ${finalCommand} ${args.join(" ")}`);

// 3. 使用 spawn 启动，完美继承标准流，不会因为输出太多导致 buffer 溢出 (这是 exec 的痛点)
const child = spawn(finalCommand, args, {
    stdio: "inherit", // 完美将 Inspector 的炫酷彩色输出实时打到当前终端
    env: process.env,
    shell: process.platform === "win32",
});

child.on("error", (error) => {
    console.error(`启动 Inspector 失败: ${error}`);
});
