---
title: 自动化测试
cover: wenyan.jpg
---

文颜 MCP Server 是一个基于模型上下文协议（Model Context Protocol, MCP）的服务器组件，支持将 Markdown 格式的文章发布至微信公众号草稿箱，并使用与 文颜 相同的主题系统进行排版。

## 使用方式

- 方式一：本地运行
- 方式二：使用 Docker 运行（推荐）

![](result_image.jpg)

```javascript
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';

// or UMD script
// <script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/marked-highlight/lib/index.umd.js"></script>
// const { Marked } = globalThis.marked;
// const { markedHighlight } = globalThis.markedHighlight;
const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

```

## 2.12 公式

### 行内公式

比如这个化学公式：$\ce{Hg^2+ ->[I-] HgI2 ->[I-] [Hg^{II}I4]^2-}$，啦啦啦

### 块公式

$$
H(D_2) = -\left(\frac{2}{4}\log_2 \frac{2}{4} + \frac{2}{4}\log_2 \frac{2}{4}\right) = 1
$$

### 矩阵

$$
\begin{pmatrix}
  1 & a_1 & a_1^2 & \cdots & a_1^n \\
  1 & a_2 & a_2^2 & \cdots & a_2^n \\
  \vdots & \vdots & \vdots & \ddots & \vdots \\
  1 & a_m & a_m^2 & \cdots & a_m^n \\
  \end{pmatrix}
$$

### 待解决

- $a^2 + b^2 = c^2$ : aaa
- $a^2 + b^2 = c^2$ : aaa
  *   **长期有效**：一旦泄露，攻击者可以持续访问你的账户，直到令牌被手动撤销。
  *   **权限过大**：经典令牌通常拥有账户的完全写入权限，远超发布所需。
  *   **泄露风险**：这些令牌必须作为 `secret` 存储在 CI/CD 平台中，存在因配置不当或在日志中意外暴露的风险。

## 链接

* [macOS App Store 版](https://github.com/caol64/wenyan) - MAC 桌面应用
* [Windows + Linux 版](https://github.com/caol64/wenyan-pc) - 跨平台桌面应用
* [CLI 版本](https://github.com/caol64/wenyan-cli) - CI/CD 或脚本自动化发布公众号文章
* [MCP 版本](https://github.com/caol64/wenyan-mcp) - 让 AI 自动发布公众号文章
