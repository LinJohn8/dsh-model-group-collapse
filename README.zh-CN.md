# dsh-model-group-collapse

[English](./README.md) | 简体中文

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web UI 插件：让输入框模型菜单里的**厂商分组可以折叠**。

![收起状态](./docs/preview.png)

## 功能

原生模型选择器会把所有厂商分组（DeepSeek 账号、官方端点、自定义厂商……）全部展开。厂商多了以后，菜单就成了一堵“模型墙”。

本插件在这层菜单上加了折叠能力：

- 每个厂商标题变成**带三角箭头的可点击开关**（`▸` 收起 / `▾` 展开）。
- **默认全部收起**。
- **当前模型所属的厂商默认展开**。
- 点击标题即可切换该厂商的展开/收起，三角箭头随之翻转，模型行显示或隐藏。
- **搜索**时命中的厂商会临时展开以显示结果；清空搜索后恢复折叠状态。
- 其余行为完全不变：两级“模型 / 推理等级”菜单、搜索、键盘导航、切换中的加载动画、官方模型标签徽章（如 “1017”）都照常工作。

![展开状态](./docs/preview-expanded.png)

在插件管理器中禁用本插件，菜单立即恢复原生外观。

## 安装

### 本地目录（开发）

1. 将本文件夹放在固定位置。
2. 在 DSH 插件管理器中从本地目录安装该 bundle，或使用 CLI：
   `dsh plugin install /path/to/dsh-model-group-collapse`
3. 重新加载 Web UI 并打开会话。

### 从 npm（发布后）

```bash
dsh plugin install dsh-model-group-collapse
```

### 从 GitHub

```bash
dsh plugin install github:LinJohn8/dsh-model-group-collapse
```

## 兼容性

- DeepSeek Harness `>=0.2.1-rc.2`（客户端插件 API `dsh.client`）。
- 在原生模型选择器之上工作：不替换任何组件，因此完全跟随宿主自身状态（流式锁定、切换中、搜索过滤），不重复维护一份状态。

## 实现原理

原生模型菜单把厂商分组渲染为 `section[data-menu-group]`，每组有一个
`[data-menu-group-heading]` 标题和若干 `button[role="menuitemradio"]` 模型行。
客户端部分在菜单打开期间观察文档并逐组增强：

- 标题加上三角箭头并变为 `role="button"` 开关；
- 收起的组用 `display:none` 隐藏模型行，并置 `aria-expanded="false"`；
- 折叠状态按组保存、每次打开菜单重置，并用当前模型行的 `aria-checked` 决定默认展开哪一组。

样式全部内联限定（`mgc-` 前缀、`--dsw-alias-*` 主题令牌），且每次 DOM 写入都做等值判断，避免菜单自身的 MutationObserver 重入。

## 许可证

[MIT](./LICENSE)
