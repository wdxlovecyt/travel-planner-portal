---
name: codex-eyes
description: Capture and inspect frontend pages visually for debugging. Use when Codex needs to open a local or remote web page, wait for the UI to settle, take a screenshot, and analyze layout bugs, rendering regressions, missing elements, broken styles, overlap, spacing, or other page-level visual issues. Also use for Chinese requests such as 页面截图, 截图看看页面, 看下页面长什么样, 视觉检查, UI 巡检, 前端视觉调试, 布局错位, 样式异常, 页面重叠, 页面空白, 元素消失, 组件没显示, 响应式问题, 首屏异常.
---

# Codex Eyes

当问题依赖“页面在浏览器里实际长什么样”时，使用这个 skill。
这个 skill 默认配合已发布的 MCP 包 `@huangwu/codex-eyes-mcp` 工作。

## 快速开始

- 先确保 Codex 已连接 `@huangwu/codex-eyes-mcp`：
  `codex mcp add codex-eyes -- npx -y @huangwu/codex-eyes-mcp`
- 使用 `capture_page` tool，它会直接返回截图和结构化结果。
- 只允许调用已经注册好的 MCP tool；不要执行仓库内的本地实现来替代 MCP。
- 明确禁止把当前工作区中的 `packages/codex-eyes-mcp`、其中的脚本文件，或任何本地 Node/Playwright 代码路径当作截图兜底方案。
- 如果 `capture_page` tool 当前不可用，就直接告知用户 MCP 未连接或 tool 不可用；不要尝试 `import('playwright')`，不要运行 `packages/codex-eyes-mcp/scripts/capture-page.mjs`，也不要自行拼装本地截图脚本。
- 如果已经知道当前项目实际启动出来的 URL，调用时优先显式传给 `url`。
- 只有在拿不到项目启动 URL 时，才回退到默认地址 `http://localhost:5173`。
- `capture_page` 默认直接返回图片内容，不强制把截图写入 `/tmp`。
- 只有在传入 `output` 时，才会把截图额外保存到本地文件。
- 如果需要先点击、输入、按键或等待，再把这些步骤放进 `actions` 数组里。
- 最好在目标前端已经启动后再执行截图。
- 如果页面需要额外等待、特定选择器或登录态，请阅读 `references/workflow.md`。

## 工作流

1. 确认要检查的页面 URL。
2. 调用 `capture_page` tool。优先把当前项目实际启动的 URL 显式传给 `url`；只有在拿不到这个地址时，才依赖默认值。如果不需要本地文件，也可以不传 `output`。
3. 如果需要先操作页面，再把点击、输入、按键、等待步骤写进 `actions`。
4. 如果问题出现在首屏以下，使用 `fullPage`。
5. 如果问题只会在数据加载后出现，使用 `waitFor`，必要时再配合 `delayMs`。
6. 使用返回的图片和结构化结果作为视觉分析依据。

## Selector 要求

- selector 要尽量精确，优先使用带容器前缀、类名、属性或文本语义的信息。
- 避免直接使用过宽的选择器，例如 `input`、`button`、`div`、`.ant-btn`，因为页面上可能有多个匹配项。
- 优先写成 `.search-bar input`、`input[placeholder*="出游攻略"]`、`.search-panel .close-icon`、`button[aria-label*="导航"]` 这种更稳定的形式。
- 如果一个页面里存在多个相似元素，先通过更小的父容器缩小范围，再执行 `click`、`fill`、`press` 等动作。
- 在编写 `actions` 时，默认先想“这个 selector 是否只会命中我真正想操作的那个元素”。

## 回答要求

- 只要本次调用过 `capture_page`，在回复用户时必须明确说明已经使用了这个 tool。
- 如果当前运行环境支持图片展示，在回复中直接展示通过 `capture_page` 获取到的截图。
- 如果当前运行环境不支持直接展示图片，就明确说明截图已经通过 `capture_page` 获取；只有在传了 `output` 时，才额外返回本地路径。
- 不要只给文字分析而省略截图；截图应作为默认交付物一起展示。

## Tool

默认调用：

- 工具名：`capture_page`
- `url`：优先传当前项目实际启动的 URL；只有拿不到时才省略并回退到 `http://localhost:5173`

常用参数：

- `url`
- `output`
- `waitFor`
- `delayMs`
- `fullPage`
- `width`
- `height`
- `timeoutMs`
- `browser`
- `actions`

`actions` 支持的操作：

- `click`：点击某个选择器
- `fill`：向某个输入框写入文本
- `press`：对某个元素发送按键
- `selectOption`：选择下拉框选项
- `hover`：悬停到某个元素
- `waitFor`：等待某个选择器达到指定状态
- `wait`：纯延时等待

`actions` 示例：

```json
[
  { "type": "fill", "selector": ".search-bar input", "value": "深圳旅游攻略" },
  { "type": "click", "selector": ".search-bar button" },
  { "type": "wait", "durationMs": 1200 }
]
```

## MCP 集成

- 这个 skill 配合已发布的 MCP 包 `@huangwu/codex-eyes-mcp` 使用。
- 在 Codex 里注册 MCP server 时，推荐使用：
  `codex mcp add codex-eyes -- npx -y @huangwu/codex-eyes-mcp`
- skill 负责告诉 Codex 什么时候调用 `capture_page`，MCP 包负责真正提供工具能力。
- 不要把当前仓库中的 `packages/codex-eyes-mcp` 视为默认实现或后备实现；这个 skill 的执行前提是“外部 MCP tool 已经注册且可调用”。

## 说明

- 这个 skill 面向 Codex 调用 `capture_page` tool。
- tool 成功后会同时返回文本结果和图片结果。
- tool 会在结构化结果里返回 `actionsExecuted`，表示截图前实际执行了多少个操作。
- 如果没有拿到 `capture_page` tool，就停止在“说明缺少 MCP/tool”这一步，不要探索本地包或本地依赖。
