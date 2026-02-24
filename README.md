<div align="center">
    <img alt = "logo" src="https://media.githubusercontent.com/media/caol64/wenyan-mcp/main/data/wenyan-mcp.png" />
</div>

# 文颜 MCP Server

[![npm](https://img.shields.io/npm/v/@wenyan-md/mcp)](https://www.npmjs.com/package/@wenyan-md/mcp)
[![License](https://img.shields.io/github/license/caol64/wenyan-mcp)](LICENSE)
![NPM Downloads](https://img.shields.io/npm/dm/%40wenyan-md%2Fmcp)
[![Docker Pulls](https://img.shields.io/docker/pulls/caol64/wenyan-mcp)](https://hub.docker.com/r/caol64/wenyan-mcp)
[![Stars](https://img.shields.io/github/stars/caol64/wenyan-mcp?style=social)](https://github.com/caol64/wenyan-mcp)

## 简介

**文颜（Wenyan）** 是一款多平台 Markdown 排版与发布工具，支持将 Markdown 一键转换并发布至：

-   微信公众号
-   知乎
-   今日头条
-   以及其它内容平台（持续扩展中）

文颜的目标是：**让写作者专注内容，而不是排版和平台适配**。

## 文颜的不同版本

文颜目前提供多种形态，覆盖不同使用场景：

-   [macOS App Store 版](https://github.com/caol64/wenyan) - MAC 桌面应用
-   [跨平台桌面版](https://github.com/caol64/wenyan-pc) - Windows/Linux
-   [CLI 版本](https://github.com/caol64/wenyan-cli) - 命令行 / CI 自动化发布
-   👉 [MCP 版本](https://github.com/caol64/wenyan-mcp) - 本项目
-   [核心库](https://github.com/caol64/wenyan-core) - 嵌入 Node / Web 项目

本仓库是 **文颜的 MCP Server 版本**，基于模型上下文协议（Model Context Protocol），旨在让 AI 助手（如 Claude Desktop）具备自动排版和发布公众号文章的能力。

-   **与 AI 深度集成**：[让 AI 帮你管理公众号的排版和发布](https://babyno.top/posts/2025/06/let-ai-help-you-manage-your-gzh-layout-and-publishing/)

<video src="https://github.com/user-attachments/assets/2c355f76-f313-48a7-9c31-f0f69e5ec207"></video>

> [!TIP]
>
> 如果与 AI 集成遇到问题，可以参考 [test/list.js](./test/list.js) 和 [test/publish.js](./test/publish.js) 中的完整调用示例。

## v2.0 新特性
- **支持 SSE 模式**
- **多租户支持 (Stateless)**：`publish_article` 工具优先使用传入的 `wechat_app_id` 和 `wechat_app_secret` 参数，不再强制依赖服务器环境变量。适合 SaaS 或多用户共享部署。
- **文件上传接口 (Secure Upload)**：新增 `POST /upload` 接口，支持上传 Markdown 文件并返回临时 `file_id`。
  - 解决 IP 限制：客户端上传文件 -> 服务器（在白名单 IP）获取内容 -> 发布到微信。
  - 节省 Token：相比直接传输全文，使用 `file_id` 引用服务器上的临时文件更高效。
  - 自动清理：上传的文件仅存储 10 分钟（可配置），之后自动销毁。
- **HTTPS 支持**：支持 `--https` 启动参数，需配合 `SSL_KEY_PATH` 和 `SSL_CERT_PATH` 环境变量使用，保障传输安全。
- **本地文件限制**：默认**禁用**本地文件访问（`--allow-local-files` 开启），以适应无状态容器化部署的安全需求。

## 运行和配置

文颜 MCP Server 支持`stdio`和`sse`两种运行模式。

### 1. stdio 模式（标准输入输出）

这是 MCP 的默认运行模式，最适合 **本地客户端**（如 Claude Desktop, VS Code）直接集成。

* **运行原理**：宿主程序（如 Claude）启动 MCP Server 作为一个子进程，通过标准输入（stdin）发送请求，通过标准输出（stdout）接收响应。
* **适用场景**：本地 AI 开发环境、个人桌面端配置。

#### 运行方式1: npm

```bash
# 安装 npm 包
npm install -g @wenyan-md/mcp
```

* **配置示例（Claude Desktop）**：
在 `claude_desktop_config.json` 中配置：
```json
{
  "mcpServers": {
    "wenyan-mcp": {
      "name": "公众号助手",
      "command": "wenyan-mcp",
      "env": {
        "WECHAT_APP_ID": "your_app_id",
        "WECHAT_APP_SECRET": "your_app_secret"
      }
    }
  }
}
```

#### 运行方式2: Docker

适合部署到服务器环境，或希望环境隔离的用户。

```bash
# 拉取镜像
docker pull caol64/wenyan-mcp
```

* **配置示例（Claude Desktop）**：

```json
{
  "mcpServers": {
    "wenyan-mcp": {
      "name": "公众号助手",
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v", "/your/host/file/path:/mnt/host-downloads",
        "-e", "WECHAT_APP_ID=your_app_id",
        "-e", "WECHAT_APP_SECRET=your_app_secret",
        "-e", "HOST_FILE_PATH=/your/host/file/path",
        "caol64/wenyan-mcp"
      ]
    }
  }
}
```

> **Docker 配置特别说明：**
>
> *   **挂载目录 (`-v`)**：必须将宿主机的文件/图片目录挂载到容器内的 `/mnt/host-downloads`。
> *   **环境变量 (`HOST_FILE_PATH`)**：必须与宿主机挂载的文件/图片目录路径保持一致。
> *   **原理**：你的 Markdown 文件/文章内所引用的本地图片应放置在该目录中，Docker 会自动将其映射，使容器能够读取并上传。

### 2. sse 模式（服务器发送事件）

SSE 模式基于 HTTP 协议，允许 MCP Server 作为一个**独立的网络服务**运行。

* **运行原理**：Server 启动一个 HTTP 端口，客户端通过 HTTP POST 发送指令，Server 通过 SSE 长连接实时推送响应数据。
* **适用场景**：远程服务器部署、多客户端共享 Server、或者宿主环境不支持子进程管理时。

#### 运行方式1: npm

```bash
# 安装 npm 包
npm install -g @wenyan-md/mcp
# 启动 HTTP 服务器
WECHAT_APP_ID=your_app_id WECHAT_APP_SECRET=your_app_secret wenyan-mcp --sse
```

* **配置示例（Claude Desktop）**：
在 `claude_desktop_config.json` 中配置：
```json
{
  "mcpServers": {
    "wenyan-mcp": {
      "name": "公众号助手",
      "baseUrl": "http://localhost:3000/sse"
    }
  }
}
```

#### 运行方式2: Docker

```bash
# 拉取镜像
docker pull caol64/wenyan-mcp
# 启动 HTTP 服务器
docker run -d \
  --rm
  -p 3000:3000 \
  -e WECHAT_APP_ID=your_app_id \
  -e WECHAT_APP_SECRET=your_app_secret \
  -v /your/host/file/path:/mnt/host-downloads \
  -e HOST_FILE_PATH=/your/host/file/path \
  --name wenyan-mcp \
  caol64/wenyan-mcp --sse
```

* **配置示例（Claude Desktop）**：
同`npm`运行时配置。

#### 运行方式3: Kubernetes

本项目提供了一份标准的 Kubernetes 部署清单，包含 Deployment 和 Service 配置。

```bash
kubectl apply -f k8s/deployment.yaml
```

该配置默认开启了 HTTP Stateless 模式，并配置了 Liveness/Readiness 探针以确保服务高可用。
请根据实际情况修改 `image` 版本或调整资源限制。

* **配置示例（Claude Desktop）**：
同`npm`运行时配置。

#### 高级配置

HTTP 服务器支持以下环境变量进行高级配置：

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `HTTP_CORS_ORIGIN` | `*` | 允许的 CORS 来源，可设置为具体域名（如 `https://example.com`）以限制跨域访问 |
| `HTTP_API_KEY` | 无 | 如果设置，所有请求必须携带 `X-API-Key` 头且值与此匹配（健康检查和根端点除外） |
| `HTTP_LOG_LEVEL` | `info` | 日志级别：`debug`、`info`、`warn`、`error` |

**带认证的 Docker 运行示例：**

```bash
docker run -d \
  --rm
  -p 3000:3000 \
  -e WECHAT_APP_ID=your_app_id \
  -e WECHAT_APP_SECRET=your_app_secret \
  -e HTTP_API_KEY=your_secret_api_key \
  -e HTTP_CORS_ORIGIN=https://yourdomain.com \
  -v /your/host/file/path:/mnt/host-downloads \
  -e HOST_FILE_PATH=/your/host/file/path \
  --name wenyan-mcp \
  caol64/wenyan-mcp --sse
```

**配置带认证的 MCP Client：**

```json
{
  "mcpServers": {
    "wenyan-mcp-http": {
      "name": "公众号助手 (HTTP)",
      "baseUrl": "http://localhost:3000/sse",
      "headers": {
        "X-API-Key": "your_secret_api_key"
      }
    }
  }
}
```

## 基本用法

### 列出主题

对AI说

> 目前你可以使用哪些公众号主题？

AI回复：

```
目前我支持的公众号主题包括以下这些，每个主题都有独特的风格和配色，适用于不同的内容调性：

1. **Default（默认）**  
   简洁经典的排版，适合长文阅读，通用性强。

2. **OrangeHeart（橙心）**  
   暖橙色调，优雅而富有活力，适合情感、生活类内容。
...
```

### 注册主题

对AI说

> 帮我把这个css(https://wenyan.yuzhi.tech/manhua.css)注册为一个新的公众号主题，名称为：xiuluochang

AI回复：

```
好的，已成功将 CSS 样式表注册为新的公众号主题，主题名称为：**xiuluochang**。

您现在可以在公众号后台选择该主题进行应用，样式将按照 `https://wenyan.yuzhi.tech/manhua.css` 的定义进行渲染。

如有需要进一步自定义或更换主题，随时告诉我！
```

### 删除主题

对AI说

> 把名为“xiuluochang”的公众号主题删除

AI回复：

```
公众号主题 “xiuluochang” 已成功删除。
```

### 发布文章

对AI说

> 使用phycat主题将这篇文章发布到微信公众号：`./tests/publish.md`

AI回复：

```
文章已成功发布至微信公众号草稿箱！🎉

- **主题**：phycat  
- **媒体ID**：xxx

您可登录微信公众号后台，在「草稿箱」中查看并编辑文章，确认无误后即可一键发布。如需进一步排版优化、添加封面或设置摘要，我也可以协助您完成！

是否需要我帮您生成一篇发布文案或封面建议？ 😊
```

## 关于图片自动上传

支持以下图片来源：

-   本地路径（如：`/Users/lei/Downloads/result_image.jpg`）
-   网络路径（如：`https://example.com/image.jpg`）

## 环境变量说明

无论使用哪种方式，都需要配置以下环境变量以连接微信公众号平台：

-   `WECHAT_APP_ID`：微信公众号平台的 App ID
-   `WECHAT_APP_SECRET`：微信公众号平台的 App Secret

## Markdown Frontmatter 说明（必读）

为了正确上传文章，每篇 Markdown 顶部需要包含 frontmatter：

```md
---
title: 在本地跑一个大语言模型(2) - 给模型提供外部知识库
cover: /Users/xxx/image.jpg
---
```

字段说明：

-   `title` 文章标题（必填）
-   `cover` 文章封面
    -   本地路径或网络图片
    -   如果正文有至少一张图片，可省略，此时将使用其中一张作为封面
    -   如果正文无图片，则必须提供 cover

## 微信公众号 IP 白名单

> [!IMPORTANT]
>
> 请确保运行文颜 MCP Server 的机器 IP 已加入微信公众号后台的 IP 白名单，否则上传接口将调用失败。

配置说明文档：[https://yuzhi.tech/docs/wenyan/upload](https://yuzhi.tech/docs/wenyan/upload)

## 示例文章格式

```md
---
title: 在本地跑一个大语言模型(2) - 给模型提供外部知识库
cover: /Users/lei/Downloads/result_image.jpg
---

在[上一篇文章](https://babyno.top/posts/2024/02/running-a-large-language-model-locally/)中，我们展示了如何在本地运行大型语言模型。本篇将介绍如何让模型从外部知识库中检索定制数据，提升答题准确率，让它看起来更“智能”。

## 准备模型

访问 `Ollama` 的模型页面，搜索 `qwen`，我们使用支持中文语义的“[通义千问](https://ollama.com/library/qwen:7b)”模型进行实验。

![](https://mmbiz.qpic.cn/mmbiz_jpg/Jsq9IicjScDVUjkPc6O22ZMvmaZUzof5bLDjMyLg2HeAXd0icTvlqtL7oiarSlOicTtiaiacIxpVOV1EeMKl96PhRPPw/640?wx_fmt=jpeg)
```

## 如何调试

推荐使用官方 Inspector 进行调试：

```bash
npx @modelcontextprotocol/inspector <command>
```

启动成功出现类似提示：

```bash
🔗 Open inspector with token pre-filled:
   http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=761c05058aa4f84ad02280e62d7a7e52ec0430d00c4c7a61492cca59f9eac299
   (Auto-open is disabled when authentication is enabled)
```

访问以上链接即可打开调试页面。

![debug](data/1.jpg)

1. 正确填写启动命令
2. 添加环境变量
3. 点击 Connect
4. 选择 Tools -> List Tools
5. 选择要调试的接口
6. 填入参数并点击 Run Tool
7. 查看完整参数

## 赞助

如果你觉得文颜对你有帮助，可以给我家猫咪买点罐头 ❤️

[https://yuzhi.tech/sponsor](https://yuzhi.tech/sponsor)

## License

Apache License Version 2.0
