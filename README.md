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

**[文颜（Wenyan）](https://wenyan.yuzhi.tech)** 是一款多平台 Markdown 排版与发布工具，支持将 Markdown 一键转换并发布至：

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
-   [UI 库](https://github.com/caol64/wenyan-ui) - 桌面应用和 Web App 共用的 UI 层封装
-   [核心库](https://github.com/caol64/wenyan-core) - 嵌入 Node / Web 项目

## 文颜 MCP Server 能做什么？

本项目旨在打造 **"从 AI 思考到公众号发布"** 的最后一公里解决方案。

通过实现 Model Context Protocol (MCP) 协议，我们将文颜（Wenyan）的排版能力赋予了 Claude Desktop 等先进的 AI 客户端。现在，你的 AI 助手不仅仅是一个聊天机器人，更是一个专业的 **公众号运营专家**。

**它能帮你实现：**
1.  **Markdown 到 微信排版 的无感转换**：告别第三方编辑器的反复复制粘贴。
2.  **所见即所得的样式控制**：通过自然语言指令（如“使用橙色主题”）控制排版风格。
3.  **全链路自动化**：在一个会话窗口内完成 选题 -> 写作 -> 排版 -> 推送草稿 的全过程。

**实战演示**：
*   [让 AI 帮你管理公众号的排版和发布](https://babyno.top/posts/2025/06/let-ai-help-you-manage-your-gzh-layout-and-publishing/)
*   [Moraya MCP 使用案例：微信公众号全托管](https://github.com/zouwei/moraya/wiki/Moraya-MCP-%E4%BD%BF%E7%94%A8%E6%A1%88%E4%BE%8B%EF%BC%9A%E5%BE%AE%E4%BF%A1%E5%85%AC%E4%BC%97%E5%8F%B7%E5%85%A8%E6%89%98%E7%AE%A1)



## 功能特性

### Markdown 原生驱动
- 原生支持标准 Markdown 语法
- 支持 FrontMatter 元数据解析
- 代码块高亮
- 数学公式渲染
- 图片自动处理与资产上传

### 公众号主题排版
- 内置多套公众号主题
- 支持自定义 CSS
- 支持代码块样式独立配置
- 自动适配微信公众号排版规范
- 保证样式稳定、不被微信过滤

### MCP 原生集成（AI 可调用）
- 提供标准 MCP Tool 接口
- 支持 AI 自动调用：
  - 渲染 Markdown
  - 上传图片资产
  - 发布草稿
- 明确的工具调用规范（upload_asset → publish_article）
- 支持多步骤自动编排

## 运行和配置

文颜 MCP Server 支持`stdio`（本地管道）和`sse`（HTTP 服务）两种运行模式。

### 1. stdio 模式（推荐）

这是 MCP 的默认运行模式，最适合 **本地客户端**（如 Claude Desktop, VS Code）直接集成。

#### 方式 A: npm 直接运行

无需 Docker，直接利用本地 Node.js 环境。

```bash
# 1. 全局安装
npm install -g @wenyan-md/mcp
# 2. 获取安装路径 (可选，如果 command 找不到命令时使用)
which wenyan-mcp
```

* **Claude Desktop 配置 (claude_desktop_config.json)：**：

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

#### 方式 B: Docker (Stdio)

适合不希望安装 Node.js 环境的用户。

```bash
docker pull caol64/wenyan-mcp:latest
```

* **Claude Desktop 配置：**：

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

### 2. SSE 模式 (HTTP 服务)

基于 HTTP/SSE 协议运行，适合`远程服务器部署`或`多客户端共享`。支持文件上传和无状态运行。

* **适用场景**：将服务部署在云服务器、Kubernetes，或使用 Web 版 MCP 客户端。

#### 运行方式 A: npm 直接运行

```bash
# 全局安装
npm install -g @wenyan-md/mcp
# 启动 HTTP 服务器
WECHAT_APP_ID=your_app_id WECHAT_APP_SECRET=your_app_secret wenyan-mcp --sse
```

#### 运行方式B: Docker 启动 (推荐)

```bash
# 拉取镜像
docker pull caol64/wenyan-mcp:latest
# 启动 HTTP 服务器
docker run -d \
  --rm
  -p 3000:3000 \
  -e WECHAT_APP_ID=your_app_id \
  -e WECHAT_APP_SECRET=your_app_secret \
  --name wenyan-mcp \
  caol64/wenyan-mcp --sse
```

启动后，服务将暴露以下端点：
- SSE 连接: http://localhost:3000/sse
- 文件上传: http://localhost:3000/upload

**如何连接 SSE 服务？**：

在支持 SSE 的 Agent 平台中配置：

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

**文件上传说明 (SSE 模式)**

在 SSE 模式下，由于服务可能运行在远程服务器，无法直接读取客户端本地文件。请按以下流程操作：

- 图片资源：使用 upload_asset 工具上传 Base64 图片，获取 asset_id。
- Markdown 文件：
  - 方式一：将文件内容直接作为 content 参数传入 publish_article。
  - 方式二：先调用 /upload 接口上传文件，获取 file_id，再传入 publish_article。

### Kubernetes 部署

本项目提供了一份标准的 Kubernetes 部署清单，包含 Deployment 和 Service 配置。

```bash
kubectl apply -f k8s/deployment.yaml
```

该配置默认开启了 HTTP Stateless 模式，并配置了 Liveness/Readiness 探针以确保服务高可用。

请根据实际情况修改 `image` 版本或调整资源限制。

### 高级配置

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

如果是 SSE 模式，且文档中包含本地图片，这样对 AI 说：

> 使用phycat主题将这篇文章发布到微信公众号：./tests/publish.md
> 
> 请注意，先将图片作为资产上传

## 关于图片自动上传

文颜 MCP Server 会自动处理 Markdown 中的图片链接，将其上传至微信素材库并替换为微信永久链接。根据运行模式不同，支持的图片来源略有差异。

### 1. 通用支持 (所有模式)

无论在哪种模式下，都支持标准的网络图片链接：

*   **网络路径**：`https://example.com/image.jpg`
    *   Server 会自动下载该图片并上传到微信服务器。

### 2. Stdio 模式 (本地进程)

在此模式下，MCP Server 与您的客户端（如 Claude Desktop）运行在同一台机器上，可以直接读取本地文件。

*   **本地绝对路径**：`/Users/username/Downloads/image.png`
*   **本地相对路径**：`./images/screenshot.png` (相对于md文件所在目录)

> [!NOTE]
> 
> **Docker 用户注意**：
> 如果您使用 Docker 运行 Stdio 模式，必须通过 `-v` 参数将宿主机的图片目录挂载到容器内，具体看说明。

### 3. SSE 模式 (远程/无状态服务)

在此模式下，Server 通常运行在远程服务器或隔离环境中，**无法直接读取**您本地电脑上的文件路径。您需要先通过工具将图片“推送”给服务器，流程如下：

#### 步骤 A: 上传图片资源

SSE 模式提供了一个专用工具 `upload_asset`，用于接收 Base64 编码的图片数据。

1.  **AI 助手读取本地文件**：将本地图片转换为 Base64 字符串。
2.  **调用工具**：调用 `upload_asset`，传入文件名和 Base64 数据。
3.  **获取 ID**：Server 返回一个临时 `file_id` (例如 `img-uuid-123.png`)。

#### 步骤 B: 在 Markdown 中引用

在调用 `publish_article` 发布文章时，请将 Markdown 中的本地图片路径替换为 **`asset://` 协议**：

*   **原始 Markdown**：
    ```markdown
    ![示例图](/Users/me/desktop/demo.png)
    ```
*   **修改后的 Markdown (发送给 Server)**：
    ```markdown
    ![示例图](asset://img-uuid-123.png)
    ```

> [!NOTE]
> 
> **自动化提示**：
> 现代 AI 助手（如 Claude）在使用本工具时，通常能够自动理解并执行 "读取本地文件 -> 转Base64上传 -> 替换链接 -> 发布" 这一完整的 Agent 工作流，无需人工干预。

## 公众号配置与鉴权

为了连接微信公众号平台，Server 需要获取 `App ID` 和 `App Secret`。本项目支持 **全局环境变量** 和 **动态参数传入** 两种配置方式，以适应不同的部署场景。

### 1. 全局配置（单租户模式）

**适用场景**：个人使用、本地 Stdio 模式、或者私有部署的单账号服务。

通过环境变量配置后，Server 将默认使用该凭证处理所有请求。

| 变量名 | 说明 |
| :--- | :--- |
| `WECHAT_APP_ID` | **必填** (若未通过参数传入) - 微信公众号平台 App ID |
| `WECHAT_APP_SECRET` | **必填** (若未通过参数传入) - 微信公众号平台 App Secret |

### 2. 动态传参（多租户/无状态模式）

**适用场景**：SSE 模式、公共服务部署、或同一个 Server 需要管理多个公众号。

在 **SSE 模式** 下，`publish_article` 工具额外开放了认证参数。客户端（或 AI Agent）可以在每次调用发布工具时，动态传入凭证。

*   **工作原理**：
    *   Server 启动时**无需**配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 环境变量。
    *   在调用 `publish_article` 时，将凭证作为参数传入。
    *   Server 将优先使用本次请求传入的凭证，实现**无状态 (Stateless)** 运行。

*   **参数优先级**：
    `工具参数 (arguments)` > `环境变量 (env)`

> [!IMPORTANT]
> 
> **安全提示**：
> 在多租户模式下，建议配合 `HTTP_API_KEY` 使用，以确保只有授权的客户端（Agent）才能调用服务，防止服务被滥用。

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

## 公众号 IP 白名单

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
