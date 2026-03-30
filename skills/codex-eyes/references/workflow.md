# 工作流

## 适用场景

- 需要通过视觉结果确认的布局问题。
- 仅靠读代码很难判断的 CSS 回归。
- 只看 DOM 状态还不够，必须拿到真实页面截图的情况。

## 推荐流程

1. 启动前端应用。
2. 调用 `capture_page` tool 打开目标页面并截图。优先把当前项目实际启动的 URL 传给 `url`，只有拿不到时才回退到默认地址。
3. 如果需要先操作页面，再把点击、输入、按键、等待步骤写进 `actions`。
4. 通过不同的等待条件或选择器反复截图，直到目标状态稳定出现。
5. 结合工具返回的图片、结构化结果和相关组件、CSS 文件一起分析问题。
6. 在最终答复中说明本次使用了 `capture_page`，并优先展示截图，再给分析结论。

## Selector 规范

- selector 要尽量写得精确，不要默认使用 `input`、`button`、`div` 这种宽选择器。
- 优先使用“容器 + 元素”的形式，例如 `.search-bar input`、`.search-panel button`。
- 优先补充稳定属性，例如 `input[placeholder*="攻略"]`、`button[aria-label*="导航"]`。
- 如果页面上有多个相似控件，先缩小到局部容器，再对容器内元素操作。
- 写 `fill` 和 `click` 时，先假设页面里还有别的输入框和按钮，尽量避免歧义。

## 安装

- 这个能力通过 MCP 包 `@huangwu/codex-eyes-mcp` 提供。
- 推荐先在 Codex 里注册：
  `codex mcp add codex-eyes -- npx -y @huangwu/codex-eyes-mcp`
- 这个 workflow 面向已经连接好该 MCP server 的 Codex 环境。

## 常用参数

- `waitFor`：等待某个选择器出现并可见后再截图。
- `delayMs`：页面加载完成或选择器出现后，再额外等待一段时间。
- `fullPage`：截取整张可滚动页面。
- `width` 和 `height`：控制视口尺寸。
- `timeoutMs`：给较慢的本地页面增加超时时间。
- `browser`：按需切换浏览器内核。
- `output`：仅当你希望把截图额外落到本地文件时再传；不传时只返回图片内容。
- `actions`：截图前先执行一组页面操作。

## actions 结构

- `click`：`{ "type": "click", "selector": ".submit-btn" }`
- `fill`：`{ "type": "fill", "selector": ".search-bar input", "value": "深圳" }`
- `press`：`{ "type": "press", "selector": ".search-bar input", "key": "Enter" }`
- `selectOption`：`{ "type": "selectOption", "selector": "select", "value": "shenzhen" }`
- `hover`：`{ "type": "hover", "selector": ".menu-item" }`
- `waitFor`：`{ "type": "waitFor", "selector": ".result-card", "state": "visible" }`
- `wait`：`{ "type": "wait", "durationMs": 1000 }`

每个动作还可以带：

- `delayMs`：动作完成后再额外等待多久
- `timeoutMs`：这个动作自己的超时

## 限制

- 这个 tool 依赖 `playwright`。
- 如果还没有安装 Playwright 浏览器运行时，命令会失败，需要先执行 `playwright install`。
- MCP tool 能返回图片内容，但前提是 Codex 会话已经连上本地 MCP server。
- 只有显式传了 `output`，tool 才会把截图额外保存到本地磁盘；默认不会依赖临时文件。
