# 文颜 MCP Server

[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/caol64/wenyan-mcp)](https://archestra.ai/mcp-catalog/caol64__wenyan-mcp)
![logo](data/wenyan-mcp.png)

## Overview

文颜 MCP Server 是一个基于模型上下文协议（Model Context Protocol, MCP）的服务器组件，支持将 Markdown 格式的文章发布至微信公众号草稿箱，并使用与 [文颜](https://yuzhi.tech/wenyan) 相同的主题系统进行排版。

https://github.com/user-attachments/assets/2c355f76-f313-48a7-9c31-f0f69e5ec207

使用场景：

- [让AI帮你管理公众号的排版和发布](https://babyno.top/posts/2025/06/let-ai-help-you-manage-your-gzh-layout-and-publishing/)

支持的主题效果预览：

- [内置主题](https://yuzhi.tech/docs/wenyan/theme)

## Features

- 列出并选择支持的文章主题
- 使用内置主题对 Markdown 内容排版
- 发布文章到微信公众号草稿箱
- 自动上传本地或网络图片

---

## 使用方式

### 方式一：本地运行

#### 编译

确保已安装 [Node.js](https://nodejs.org/) 环境：

```bash
git clone https://github.com/caol64/wenyan-mcp.git
cd wenyan-mcp

npm install
npx tsc -b && npm run copy-assets
```

#### 与 MCP Client 集成

在你的 MCP 配置文件中加入以下内容：

```json
{
  "mcpServers": {
    "wenyan-mcp": {
      "name": "公众号助手",
      "command": "node",
      "args": [
        "Your/path/to/wenyan-mcp/dist/index.js"
      ],
      "env": {
        "WECHAT_APP_ID": "your_app_id",
        "WECHAT_APP_SECRET": "your_app_secret"
      }
    }
  }
}
```

> 说明：
>
> * `WECHAT_APP_ID` 微信公众号平台的 App ID
> * `WECHAT_APP_SECRET` 微信平台的 App Secret

---

### 方式二：使用 Docker 运行（推荐）

适合部署到服务器环境，或与本地 AI 工具链集成。

#### 构建镜像

```bash
docker build -t wenyan-mcp .
```

#### 与 MCP Client 集成

在你的 MCP 配置文件中加入以下内容：

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
        "-v", "/your/host/image/path:/mnt/host-downloads",
        "-e", "WECHAT_APP_ID=your_app_id",
        "-e", "WECHAT_APP_SECRET=your_app_secret",
        "-e", "HOST_IMAGE_PATH=/your/host/image/path",
        "wenyan-mcp"
      ]
    }
  }
}
```

> 说明：
>
> * `-v` 挂载宿主机目录，使容器内部可以访问本地图片。与环境变量`HOST_IMAGE_PATH`保持一致。你的 `Markdown` 文章内的本地图片应该都放置在该目录中，docker会自动将它们映射到容器内。容器无法读取在该目录以外的图片。
> * `-e` 注入docker容器的环境变量：
> * `WECHAT_APP_ID` 微信公众号平台的 App ID
> * `WECHAT_APP_SECRET` 微信平台的 App Secret
> * `HOST_IMAGE_PATH` 宿主机图片目录

---

## 微信公众号 IP 白名单

请务必将服务器 IP 加入公众号平台的 IP 白名单，以确保上传接口调用成功。
详细配置说明请参考：[https://yuzhi.tech/docs/wenyan/upload](https://yuzhi.tech/docs/wenyan/upload)

---

## 配置说明（Frontmatter）

为了可以正确上传文章，需要在每一篇 Markdown 文章的开头添加一段`frontmatter`，提供`title`、`cover`两个字段：

```md
---
title: 在本地跑一个大语言模型(2) - 给模型提供外部知识库
cover: /Users/lei/Downloads/result_image.jpg
---
```

* `title` 是文章标题，必填。
* `cover` 是文章封面，支持本地路径和网络图片：

  * 如果正文有至少一张图片，可省略，此时将使用其中一张作为封面；
  * 如果正文无图片，则必须提供 cover。

---

## 关于图片自动上传

* 支持图片路径：

  * 本地路径（如：`/Users/lei/Downloads/result_image.jpg`）
  * 网络路径（如：`https://example.com/image.jpg`）

---

## 示例文章格式

```md
---
title: 在本地跑一个大语言模型(2) - 给模型提供外部知识库
description: Make your local large language models (LLMs) smarter! This guide shows how to use LangChain and RAG to let them retrieve data from external knowledge bases, improving answer accuracy.
cover: /Users/lei/Downloads/result_image.jpg
---

在[上一篇文章](https://babyno.top/posts/2024/02/running-a-large-language-model-locally/)中，我们展示了如何在本地运行大型语言模型。本篇将介绍如何让模型从外部知识库中检索定制数据，提升答题准确率，让它看起来更“智能”。

## 准备模型

访问 `Ollama` 的模型页面，搜索 `qwen`，我们使用支持中文语义的“[通义千问](https://ollama.com/library/qwen:7b)”模型进行实验。

![](https://mmbiz.qpic.cn/mmbiz_jpg/Jsq9IicjScDVUjkPc6O22ZMvmaZUzof5bLDjMyLg2HeAXd0icTvlqtL7oiarSlOicTtiaiacIxpVOV1EeMKl96PhRPPw/640?wx_fmt=jpeg)
```

---

## 如何调试

使用 Inspector 进行简单调试：

```
npx @modelcontextprotocol/inspector
```

启动成功出现类似提示：

```
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

---

## 赞助

如果您觉得这个项目不错，可以给我家猫咪买点罐头吃。[喂猫❤️](https://yuzhi.tech/sponsor)

---

## License

Apache License Version 2.0
