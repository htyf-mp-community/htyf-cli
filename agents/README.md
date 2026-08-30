# HTYF AI Agent 使用说明

`agents` 目录保存 HTYF 迁移的详细规则；可执行入口已经封装为仓库级 Codex
Skill：`.agents/skills/htyf-migration`。支持 Agent Skills 的 Codex 打开本
仓库后可以自动匹配，也可以通过 `$htyf-migration` 显式调用。

## 当前 Agent

[`migration-rules.md`](../.agents/skills/htyf-migration/references/migration-rules.md)
是迁移规则的单一事实来源；[`SKILL.md`](../.agents/skills/htyf-migration/SKILL.md)
提供 Codex 的发现、调用和执行入口。两者共同用于把已有小程序或应用迁移到
React Native `htyf` 项目，并指导 AI 完成以下工作：

- 盘点源项目的页面、路由、状态、接口、资源和原生能力；
- 按功能逐项迁移并保持交互、异常状态和权限行为一致；
- 仅使用允许的 React Native 原生依赖；
- 使用 React Navigation 统一路由，并用独立命名空间的 MMKV 持久化数据；
- 原生功能优先寻找 JS 方案，必须改 iOS/Android 源码时记录缺口并交由人工处理；
- 底部弹窗可使用 `@gorhom/bottom-sheet`，并保持在 HTYF React 根树内；
- 正确适配 HTYF 胶囊区域、Safe Area、横竖屏及像素坐标；
- 补充坐标转换、矩形避让和页面布局测试；
- 本地缺少 HTYF 模板时，先征得用户同意，再从官方仓库获取模板。

完整规则只在迁移任务中按需加载，其他开发任务不会携带这份长上下文。

## 使用方法

1. 使用 Codex 打开本仓库。新建会话后，仓库 Skill 会出现在可用 Skill
   中；修改 Skill 后应重新启动会话以刷新发现结果。
2. 在提示词中明确源项目路径、目标 `htyf` 路径和本次迁移范围。路径未知
   时让 AI 先检查工作区，不要猜测目录。
3. 要求 AI 先输出功能清单，再开始迁移。迁移结束后检查其完成报告、差异
   说明和测试结果。
4. 如果 AI 提示本地缺少 HTYF 模板，确认是否允许它从
   [`htyf-mp-community/htyf-cli`](https://github.com/htyf-mp-community/htyf-cli.git)
   的 `packages/cli/_apps_temp_` 获取模板。未经确认不会下载或覆盖文件。

推荐提示词：

```text
使用 $htyf-migration，将 <源项目绝对路径> 的全部功能迁移到
<目标 htyf 绝对路径>。先盘点功能并生成迁移清单，再逐项实现和测试；不要
遗漏加载、空数据、错误、权限和横竖屏场景。完成后报告功能对应关系、使用的
原生模块、仍有差异的项目以及实际执行的验证命令。
```

只迁移某个功能时可以缩小范围：

```text
使用 $htyf-migration，只迁移 <页面或功能名称>。源代码位于
<源路径>，目标位于 <目标路径>。检查它依赖的路由、接口、状态和资源，完成
相关测试，不改动无关功能。
```

## 维护指南

- Skill 的触发与执行入口位于 `.agents/skills/htyf-migration/SKILL.md`。
- 新增迁移约束时更新
  [`migration-rules.md`](../.agents/skills/htyf-migration/references/migration-rules.md)，
  避免在多个文件重复维护同一规则。
- 新增其他类型的 Agent 时，为其创建独立 Markdown 文件，并在根目录
  `.agents/skills/<skill-name>/SKILL.md` 中配置清晰、具体的触发条件。
