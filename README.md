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

本仓库是 **文颜的 MCP Server 版本**，基于模型上下文协议（Model Context Protocol），旨在让 AI 助手（如 Claude Desktop）具备自动排版和发布公众号文章的能力。

## 文颜的不同版本

文颜目前提供多种形态，覆盖不同使用场景：

-   [macOS App Store 版](https://github.com/caol64/wenyan) - MAC 桌面应用
-   [跨平台桌面版](https://github.com/caol64/wenyan-pc) - Windows/Linux
-   [CLI 版本](https://github.com/caol64/wenyan-cli) - 命令行工具
-   👉 [MCP 版本](https://github.com/caol64/wenyan-mcp) - 本项目
-   [核心库](https://github.com/caol64/wenyan-core) - 嵌入 Node / Web 项目

## 功能特性

-   列出并选择支持的文章主题
-   使用内置主题对 Markdown 内容排版
-   自动处理并上传图片（本地 / 网络）
-   一键发布文章到微信公众号草稿箱
-   **与 AI 深度集成**：让 AI 帮你管理公众号的排版和发布

## 主题效果预览

👉 [内置主题预览](https://yuzhi.tech/docs/wenyan/theme)

文颜内置并适配了多个优秀的 Typora 主题，在此感谢原作者：

-   [Orange Heart](https://github.com/evgo2017/typora-theme-orange-heart)
-   [Rainbow](https://github.com/thezbm/typora-theme-rainbow)
-   [Lapis](https://github.com/YiNNx/typora-theme-lapis)
-   [Pie](https://github.com/kevinzhao2233/typora-theme-pie)
-   [Maize](https://github.com/BEATREE/typora-maize-theme)
-   [Purple](https://github.com/hliu202/typora-purple-theme)
-   [物理猫-薄荷](https://github.com/sumruler/typora-theme-phycat)

## 安装与集成

文颜 MCP Server 支持多种运行方式，请根据你的环境选择。

### 方式一：npm 安装（推荐）

直接安装到本地：

```bash
npm install -g @wenyan-md/mcp
```

**配置 MCP Client（如 Claude Desktop）：**

在你的 MCP 配置文件中加入以下内容：

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

### 方式二：Docker 运行（推荐）

适合部署到服务器环境，或希望环境隔离的用户。

**拉取镜像：**

```bash
docker pull caol64/wenyan-mcp
```

**配置 MCP Client：**

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

## 关于图片自动上传

支持以下图片来源：

-   本地路径（如：`/Users/lei/Downloads/result_image.jpg`）
-   网络路径（如：`https://example.com/image.jpg`）

## 微信公众号 IP 白名单

> ⚠️ 重要
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
