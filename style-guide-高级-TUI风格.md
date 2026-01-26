# 统一风格规范

目标：在不引入框架/依赖的前提下，用纯 HTML + CSS 复刻并统一视觉语言，同时提供**可复用 Prompt**、**Design Tokens（W3C 格式）**、以及一套**组件级 CSS 类（`.ui-*`）**；支持移动端与暗色模式。

---

## 1) 风格摘要

**整体气质**
- 高级克制：大留白、低饱和中性色、少量高纯度主色点缀
- 可读性优先：舒适行高（正文约 `1.4–1.5`）、信息层级清晰、交互状态变化克制（`~200ms`）

**关键视觉锚点**
- 主色：`#116dff`
- 强调/次强调：`#4d33de`
- 背景：`#f9fafa`
- 次级背景/分区底：`#f7f8f8`（页面变量 `--wsr-section-header-color-bg`）
- 卡片/表面：`#ffffff`
- 主文本：`#20303c`
- 暗色按钮底：`#161616`
- 边框：`#dfe5eb`（页面变量 `--wsr-section-header-color-border`）
- 轻阴影（浮层）：`0 2px 18px rgba(129,162,182,.2)`
- Focus/强调环：`rgba(17,109,255,.18)`（页面变量 `--wsr-color-B10-18`）
- 排版：
  - UI Sans（正文/表单/导航）：Avenir 风格的无衬线（页面为 `avenir-*`），可用系统无衬线栈兜底
  - Display Serif（大标题/栏目标题）：Playfair Display 风格衬线（页面为 `playfairdisplay-bold`），可用系统衬线栈兜底
- 响应式关键断点：`768px`（页面变量 `--screen-width-xs:768px`），本规范采用**移动优先 + 仅 1 个断点**：`@media (min-width: 768px)`

---

## 2) 可复用 Prompt（用于让 LLM 生成页面/组件代码）

作为最高优先级消息

```text
你是资深前端 UI/UX 工程师。请用纯 HTML + 纯 CSS 生成页面与组件（不使用任何框架/库/预处理器），并严格遵守以下设计体系：

1) 风格：高级克制、可读性优先、留白充足；以浅灰背景 + 白色表面为主；主色为 #116dff，次强调为 #4d33de；文字主色 #20303c；边框 #dfe5eb；阴影克制（elevation 以 0 2px 18px rgba(129,162,182,.2) 为上限）；交互过渡 ~200ms。
2) 响应式：移动优先；仅使用一个断点：@media (min-width: 768px)；移动端触控目标不小于 40px 高。
3) 暗色模式：同时提供 light/dark 两套 token，通过在 <html> 或 <body> 上设置 data-theme="dark" 切换。
4) 只使用本规范的 CSS 变量与类名体系：
   - CSS 变量使用 --ui-*（例如 --ui-color-primary、--ui-radius-md、--ui-space-3）
   - 组件类名前缀统一为 .ui-（例如 .ui-btn、.ui-input、.ui-card、.ui-table...）
5) 可访问性：所有表单控件都有 <label>；支持键盘导航；提供 :focus-visible 可见焦点环；使用 aria-* 表达状态（例如 aria-invalid、aria-current、aria-selected）。
6) 输出要求：只输出一个完整 HTML（可内联 <style>）；结构语义化（header/nav/main/section/footer）；不输出任何解释性文字。
```

---

## 3) Design Tokens（W3C Design Tokens 格式）

> 说明：Machine Readable的统一配置；CSS 变量部分与之对应，建议在工程里保持一致命名。

```json
{
  "$schema": "https://json.schemastore.org/design-tokens.json",
  "ui": {
    "breakpoint": {
      "md": { "type": "dimension", "value": "768px" }
    },
    "color": {
      "primary": { "type": "color", "value": "#116dff" },
      "accent": { "type": "color", "value": "#4d33de" },
      "bg": { "type": "color", "value": "#f9fafa" },
      "bgSubtle": { "type": "color", "value": "#f7f8f8" },
      "surface": { "type": "color", "value": "#ffffff" },
      "text": { "type": "color", "value": "#20303c" },
      "textMuted": { "type": "color", "value": "#5b6b7a" },
      "border": { "type": "color", "value": "#dfe5eb" },
      "black": { "type": "color", "value": "#161616" },
      "focusRing": { "type": "color", "value": "rgba(17,109,255,.18)" },
      "danger": { "type": "color", "value": "#e62214" },
      "success": { "type": "color", "value": "#25a55a" },
      "warning": { "type": "color", "value": "#fdb10c" }
    },
    "font": {
      "sans": {
        "type": "fontFamily",
        "value": "Madefor, Avenir, \"Avenir Next\", \"Helvetica Neue\", Helvetica, Arial, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif"
      },
      "serif": {
        "type": "fontFamily",
        "value": "\"Playfair Display\", \"Times New Roman\", Times, \"Songti SC\", serif"
      }
    },
    "fontSize": {
      "12": { "type": "fontSize", "value": "12px" },
      "14": { "type": "fontSize", "value": "14px" },
      "16": { "type": "fontSize", "value": "16px" },
      "17": { "type": "fontSize", "value": "17px" },
      "20": { "type": "fontSize", "value": "20px" },
      "22": { "type": "fontSize", "value": "22px" },
      "38": { "type": "fontSize", "value": "38px" }
    },
    "lineHeight": {
      "tight": { "type": "number", "value": 1.2 },
      "normal": { "type": "number", "value": 1.4 },
      "relaxed": { "type": "number", "value": 1.5 }
    },
    "space": {
      "0": { "type": "dimension", "value": "0px" },
      "1": { "type": "dimension", "value": "4px" },
      "2": { "type": "dimension", "value": "8px" },
      "3": { "type": "dimension", "value": "12px" },
      "4": { "type": "dimension", "value": "16px" },
      "5": { "type": "dimension", "value": "24px" },
      "6": { "type": "dimension", "value": "32px" },
      "7": { "type": "dimension", "value": "48px" },
      "8": { "type": "dimension", "value": "72px" }
    },
    "radius": {
      "sm": { "type": "dimension", "value": "6px" },
      "md": { "type": "dimension", "value": "11px" },
      "pill": { "type": "dimension", "value": "999px" }
    },
    "shadow": {
      "sm": { "type": "shadow", "value": "0 1px 4px rgba(0,6,36,.12)" },
      "md": { "type": "shadow", "value": "0 2px 18px rgba(129,162,182,.2)" }
    },
    "motion": {
      "fast": { "type": "duration", "value": "120ms" },
      "base": { "type": "duration", "value": "200ms" }
    },
    "theme": {
      "dark": {
        "color": {
          "bg": { "type": "color", "value": "#0b0f14" },
          "bgSubtle": { "type": "color", "value": "#0f1620" },
          "surface": { "type": "color", "value": "#111a24" },
          "text": { "type": "color", "value": "#e6edf3" },
          "textMuted": { "type": "color", "value": "#a8b3c4" },
          "border": { "type": "color", "value": "#243241" },
          "focusRing": { "type": "color", "value": "rgba(17,109,255,.28)" }
        }
      }
    }
  }
}
```

---

## 4) CSS Tokens（`:root` + 暗色模式）

> 用法：将以下 CSS 复制到你的 `theme.css` 或 `<style>` 顶部；暗色模式通过在根节点上设置 `data-theme="dark"` 启用：`<html data-theme="dark">`。

```css
:root {
  /* breakpoint */
  --ui-bp-md: 768px;

  /* colors (light) */
  --ui-color-primary: #116dff;
  --ui-color-accent: #4d33de;
  --ui-color-bg: #f9fafa;
  --ui-color-bg-subtle: #f7f8f8;
  --ui-color-surface: #ffffff;
  --ui-color-text: #20303c;
  --ui-color-text-muted: #5b6b7a;
  --ui-color-border: #dfe5eb;
  --ui-color-black: #161616;
  --ui-color-danger: #e62214;
  --ui-color-success: #25a55a;
  --ui-color-warning: #fdb10c;

  /* effects */
  --ui-shadow-sm: 0 1px 4px rgba(0, 6, 36, 0.12);
  --ui-shadow-md: 0 2px 18px rgba(129, 162, 182, 0.2);
  --ui-focus-ring: 0 0 0 3px rgba(17, 109, 255, 0.18);

  /* typography */
  --ui-font-sans: Madefor, Avenir, "Avenir Next", "Helvetica Neue", Helvetica, Arial,
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --ui-font-serif: "Playfair Display", "Times New Roman", Times, "Songti SC", serif;
  --ui-font-size-12: 12px;
  --ui-font-size-14: 14px;
  --ui-font-size-16: 16px;
  --ui-font-size-17: 17px;
  --ui-font-size-20: 20px;
  --ui-font-size-22: 22px;
  --ui-font-size-38: 38px;
  --ui-line-height-tight: 1.2;
  --ui-line-height-normal: 1.4;
  --ui-line-height-relaxed: 1.5;

  /* spacing */
  --ui-space-0: 0px;
  --ui-space-1: 4px;
  --ui-space-2: 8px;
  --ui-space-3: 12px;
  --ui-space-4: 16px;
  --ui-space-5: 24px;
  --ui-space-6: 32px;
  --ui-space-7: 48px;
  --ui-space-8: 72px;

  /* radius */
  --ui-radius-sm: 6px;
  --ui-radius-md: 11px;
  --ui-radius-pill: 999px;

  /* motion */
  --ui-duration-fast: 120ms;
  --ui-duration-base: 200ms;
  --ui-ease: linear;

  /* layout (content template) */
  --ui-container-max: 980px;
  --ui-container-pad: 24px;

  color-scheme: light;
}

[data-theme="dark"] {
  --ui-color-bg: #0b0f14;
  --ui-color-bg-subtle: #0f1620;
  --ui-color-surface: #111a24;
  --ui-color-text: #e6edf3;
  --ui-color-text-muted: #a8b3c4;
  --ui-color-border: #243241;
  --ui-focus-ring: 0 0 0 3px rgba(17, 109, 255, 0.28);
  color-scheme: dark;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --ui-duration-fast: 0ms;
    --ui-duration-base: 0ms;
  }
}
```

---

## 5) 基础规范（UI/UX 可读性与高级感）

**排版与层级（建议默认值）**
- 页面标题：`font-family: var(--ui-font-serif)`；`font-size: var(--ui-font-size-38)`；`line-height: 1.4`
- 区块标题：Serif `20px` 或 Sans `20px`（强调操作时用 Sans Bold）
- 正文/表单/表格：Sans `16–17px`；行高 `1.4–1.5`
- 次要信息：`14px`；避免过浅灰导致可读性下降

**布局与间距**
- 移动端：容器左右内边距 `24px`；组件间距用 `8/12/16/24` 递增
- 桌面端：仍保持同一节奏，避免“密度突然变高”

**交互与状态**
- hover/active 变化以“轻微亮度/透明度/边框色”实现，避免大幅位移
- Focus 统一用 `--ui-focus-ring`，必须可见（键盘可用）
- 禁用态：降低饱和/对比 + 禁止 hover 变化

**移动端触控**
- 主要点击控件高度建议 `40px+`；表格在移动端默认横向滚动（不强行压缩列）

---

## 6) 组件 CSS（`.ui-*`，含全状态）

> 说明：这是“可直接复制使用”的统一组件样式；如需更严格的 BEM/命名细化，可在此基础上扩展。

```css
/* base */
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: var(--ui-color-bg);
  color: var(--ui-color-text);
  font-family: var(--ui-font-sans);
  font-size: var(--ui-font-size-16);
  line-height: var(--ui-line-height-relaxed);
}
a { color: var(--ui-color-text); text-decoration: underline; text-underline-offset: 2px; }
a:hover { color: #3aa6ff; }

:focus-visible {
  outline: none;
  box-shadow: var(--ui-focus-ring);
  border-radius: var(--ui-radius-sm);
}

.ui-container {
  width: 100%;
  max-width: var(--ui-container-max);
  margin: 0 auto;
  padding: 0 var(--ui-container-pad);
}

.ui-stack { display: flex; flex-direction: column; gap: var(--ui-space-4); }
.ui-cluster { display: flex; flex-wrap: wrap; gap: var(--ui-space-3); align-items: center; }

@media (min-width: 768px) {
  .ui-container { padding: 0 calc(var(--ui-container-pad) * 2); }
}

/* button */
.ui-btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: var(--ui-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ui-space-2);
  padding: 0 var(--ui-space-4);
  height: 42px;
  line-height: 1;
  font: inherit;
  font-size: var(--ui-font-size-14);
  cursor: pointer;
  user-select: none;
  transition: background-color var(--ui-duration-base) var(--ui-ease),
  border-color var(--ui-duration-base) var(--ui-ease),
  color var(--ui-duration-base) var(--ui-ease),
  box-shadow var(--ui-duration-base) var(--ui-ease),
  opacity var(--ui-duration-base) var(--ui-ease);
}
.ui-btn--primary {
  background: var(--ui-color-primary);
  color: #fff;
}
.ui-btn--primary:hover { background: rgba(17, 109, 255, 0.8); }
.ui-btn--primary:active { background: rgba(17, 109, 255, 0.9); }

.ui-btn--secondary {
  background: var(--ui-color-surface);
  border-color: var(--ui-color-border);
  color: var(--ui-color-text);
}
.ui-btn--secondary:hover { border-color: rgba(17, 109, 255, 0.4); }
.ui-btn--secondary:active { background: var(--ui-color-bg-subtle); }

.ui-btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--ui-color-text);
}
.ui-btn--ghost:hover { color: var(--ui-color-accent); }
.ui-btn--ghost:active { opacity: 0.85; }

.ui-btn--danger {
  background: var(--ui-color-danger);
  color: #fff;
}
.ui-btn--danger:hover { opacity: 0.9; }

.ui-btn:disabled,
.ui-btn[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
.ui-btn.is-loading {
  cursor: progress;
  position: relative;
  padding-right: calc(var(--ui-space-4) + 20px);
}
.ui-btn.is-loading::after {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,.55);
  border-top-color: rgba(255,255,255,1);
  position: absolute;
  right: var(--ui-space-3);
  animation: ui-spin 1s linear infinite;
}
@keyframes ui-spin { to { transform: rotate(1turn); } }

/* field / input */
.ui-field { display: grid; gap: var(--ui-space-2); }
.ui-label { font-size: var(--ui-font-size-14); color: var(--ui-color-text); }
.ui-hint { font-size: var(--ui-font-size-12); color: var(--ui-color-text-muted); }
.ui-error { font-size: var(--ui-font-size-12); color: var(--ui-color-danger); }

.ui-input,
.ui-textarea,
.ui-select {
  width: 100%;
  border: 1px solid var(--ui-color-border);
  border-radius: var(--ui-radius-sm);
  background: var(--ui-color-surface);
  color: var(--ui-color-text);
  font: inherit;
  font-size: var(--ui-font-size-16);
  line-height: var(--ui-line-height-normal);
  padding: 10px var(--ui-space-4);
  transition: border-color var(--ui-duration-base) var(--ui-ease),
    box-shadow var(--ui-duration-base) var(--ui-ease),
    background-color var(--ui-duration-base) var(--ui-ease);
}
.ui-textarea { min-height: 96px; resize: vertical; }
.ui-input::placeholder,
.ui-textarea::placeholder { color: rgba(32, 48, 60, 0.55); }
[data-theme="dark"] .ui-input::placeholder,
[data-theme="dark"] .ui-textarea::placeholder { color: rgba(230, 237, 243, 0.55); }

.ui-input:hover,
.ui-textarea:hover,
.ui-select:hover { border-color: rgba(17, 109, 255, 0.35); }
.ui-input:focus,
.ui-textarea:focus,
.ui-select:focus { outline: none; box-shadow: var(--ui-focus-ring); border-color: rgba(17, 109, 255, 0.55); }

.ui-input:disabled,
.ui-textarea:disabled,
.ui-select:disabled {
  background: var(--ui-color-bg-subtle);
  color: var(--ui-color-text-muted);
  cursor: not-allowed;
}

.ui-input[aria-invalid="true"],
.ui-textarea[aria-invalid="true"],
.ui-select[aria-invalid="true"] {
  border-color: rgba(230, 34, 20, 0.65);
}

/* select */
.ui-select {
  appearance: none;
  padding-right: 40px;
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%),
    linear-gradient(to right, transparent, transparent);
  background-position:
    calc(100% - 18px) 50%,
    calc(100% - 12px) 50%,
    0 0;
  background-size: 6px 6px, 6px 6px, 100% 100%;
  background-repeat: no-repeat;
}

/* card */
.ui-card {
  background: var(--ui-color-surface);
  border: 1px solid var(--ui-color-border);
  border-radius: var(--ui-radius-sm);
  box-shadow: var(--ui-shadow-sm);
  padding: var(--ui-space-5);
}
.ui-card--flat { box-shadow: none; }

/* list */
.ui-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--ui-color-border);
  border-radius: var(--ui-radius-sm);
  background: var(--ui-color-surface);
}
.ui-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ui-space-4);
  padding: var(--ui-space-4) var(--ui-space-5);
  border-top: 1px solid var(--ui-color-border);
}
.ui-list__item:first-child { border-top: 0; }
.ui-list__item:hover { background: var(--ui-color-bg-subtle); }

/* nav */
.ui-nav { display: flex; gap: var(--ui-space-4); align-items: center; }
.ui-nav__link {
  color: var(--ui-color-text);
  text-decoration: none;
  padding: var(--ui-space-2) var(--ui-space-3);
  border-radius: var(--ui-radius-sm);
}
.ui-nav__link:hover { color: var(--ui-color-accent); background: var(--ui-color-bg-subtle); }
.ui-nav__link[aria-current="page"] { color: var(--ui-color-primary); }

/* tabs (ARIA) */
.ui-tablist { display: flex; gap: var(--ui-space-2); border-bottom: 1px solid var(--ui-color-border); }
.ui-tab {
  appearance: none;
  border: 1px solid transparent;
  border-bottom: none;
  background: transparent;
  color: var(--ui-color-text-muted);
  padding: var(--ui-space-3) var(--ui-space-4);
  border-top-left-radius: var(--ui-radius-sm);
  border-top-right-radius: var(--ui-radius-sm);
  cursor: pointer;
}
.ui-tab:hover { color: var(--ui-color-text); }
.ui-tab[aria-selected="true"] {
  color: var(--ui-color-text);
  background: var(--ui-color-surface);
  border-color: var(--ui-color-border);
}
.ui-tabpanel {
  border: 1px solid var(--ui-color-border);
  border-top: none;
  border-bottom-left-radius: var(--ui-radius-sm);
  border-bottom-right-radius: var(--ui-radius-sm);
  padding: var(--ui-space-5);
  background: var(--ui-color-surface);
}

/* table */
.ui-table-wrap { width: 100%; overflow: auto; border-radius: var(--ui-radius-sm); border: 1px solid var(--ui-color-border); background: var(--ui-color-surface); }
.ui-table { width: 100%; border-collapse: collapse; min-width: 640px; }
.ui-table th, .ui-table td {
  text-align: left;
  padding: var(--ui-space-3) var(--ui-space-4);
  border-bottom: 1px solid var(--ui-color-border);
  font-size: var(--ui-font-size-14);
  white-space: nowrap;
}
.ui-table th { color: var(--ui-color-text); background: var(--ui-color-bg-subtle); font-weight: 600; }
.ui-table tr:hover td { background: rgba(17, 109, 255, 0.05); }
.ui-table--striped tbody tr:nth-child(2n) td { background: rgba(0, 0, 0, 0.02); }
[data-theme="dark"] .ui-table--striped tbody tr:nth-child(2n) td { background: rgba(255, 255, 255, 0.03); }

/* modal (dialog recommended) */
.ui-modal {
  border: 1px solid var(--ui-color-border);
  border-radius: var(--ui-radius-sm);
  padding: 0;
  width: min(560px, calc(100vw - 2 * var(--ui-space-5)));
  box-shadow: var(--ui-shadow-md);
  background: var(--ui-color-surface);
}
.ui-modal::backdrop { background: rgba(0, 0, 0, 0.35); }
.ui-modal__header, .ui-modal__body, .ui-modal__footer { padding: var(--ui-space-5); }
.ui-modal__header { border-bottom: 1px solid var(--ui-color-border); }
.ui-modal__footer { border-top: 1px solid var(--ui-color-border); display: flex; justify-content: flex-end; gap: var(--ui-space-3); }

/* alert / toast */
.ui-alert {
  border: 1px solid var(--ui-color-border);
  border-left: 4px solid var(--ui-color-primary);
  border-radius: var(--ui-radius-sm);
  padding: var(--ui-space-4) var(--ui-space-5);
  background: var(--ui-color-surface);
}
.ui-alert--danger { border-left-color: var(--ui-color-danger); }
.ui-alert--success { border-left-color: var(--ui-color-success); }
.ui-alert--warning { border-left-color: var(--ui-color-warning); }

.ui-toast {
  position: fixed;
  left: 50%;
  bottom: var(--ui-space-6);
  transform: translateX(-50%);
  background: var(--ui-color-black);
  color: #fff;
  border-radius: var(--ui-radius-sm);
  padding: var(--ui-space-3) var(--ui-space-4);
  box-shadow: var(--ui-shadow-md);
  max-width: calc(100vw - 2 * var(--ui-space-5));
}

/* pagination */
.ui-pagination { display: flex; gap: var(--ui-space-2); align-items: center; }
.ui-page {
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ui-color-border);
  border-radius: var(--ui-radius-sm);
  background: var(--ui-color-surface);
  color: var(--ui-color-text);
  text-decoration: none;
}
.ui-page:hover { border-color: rgba(17, 109, 255, 0.4); }
.ui-page[aria-current="page"] { background: rgba(17, 109, 255, 0.12); border-color: rgba(17, 109, 255, 0.3); color: var(--ui-color-text); }

/* breadcrumb */
.ui-breadcrumb { display: flex; flex-wrap: wrap; gap: var(--ui-space-2); align-items: center; padding: 0; margin: 0; list-style: none; }
.ui-breadcrumb__item { color: var(--ui-color-text-muted); font-size: var(--ui-font-size-14); }
.ui-breadcrumb__item a { color: inherit; text-decoration: none; }
.ui-breadcrumb__item a:hover { color: var(--ui-color-accent); }
.ui-breadcrumb__sep { color: var(--ui-color-border); }

/* avatar */
.ui-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: var(--ui-color-bg-subtle);
  border: 1px solid var(--ui-color-border);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-text-muted);
  font-size: var(--ui-font-size-14);
}
.ui-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* badge (徽标) */
.ui-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 var(--ui-space-2);
  border-radius: var(--ui-radius-pill);
  background: rgba(17, 109, 255, 0.12);
  color: var(--ui-color-primary);
  font-size: var(--ui-font-size-12);
  border: 1px solid rgba(17, 109, 255, 0.2);
}

/* skeleton */
.ui-skeleton {
  position: relative;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.06);
  border-radius: var(--ui-radius-sm);
}
[data-theme="dark"] .ui-skeleton { background: rgba(255, 255, 255, 0.08); }
.ui-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
  animation: ui-shimmer 1.2s ease-in-out infinite;
}
@keyframes ui-shimmer { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) {
  .ui-skeleton::after { animation: none; }
}

/* empty state */
.ui-empty {
  text-align: center;
  padding: var(--ui-space-7) var(--ui-space-5);
  border: 1px dashed var(--ui-color-border);
  border-radius: var(--ui-radius-sm);
  background: var(--ui-color-surface);
}
.ui-empty__title { margin: 0 0 var(--ui-space-2); font-size: var(--ui-font-size-20); line-height: var(--ui-line-height-normal); }
.ui-empty__desc { margin: 0 0 var(--ui-space-4); color: var(--ui-color-text-muted); font-size: var(--ui-font-size-14); }
```

---

## 7) 快速落地建议

- 在项目中提供一个全局样式入口（例如 `app.css`），按顺序粘贴：`CSS Tokens` → `组件 CSS`
- 根节点默认 light：`<html>`；暗色模式：`<html data-theme="dark">`
- 页面容器使用 `.ui-container`，组件一律使用 `.ui-*` 类名，避免与业务 CSS 冲突
