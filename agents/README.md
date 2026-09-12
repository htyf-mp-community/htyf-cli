# HTYF AI Agent 使用说明

`agents` 目录提供 HTYF 迁移说明；详细规则与执行入口已经封装为仓库级 Codex
Skill：`.agents/skills/htyf-migration`。支持 Agent Skills 的 Codex 打开本
仓库后可以自动匹配，也可以通过 `$htyf-migration` 显式调用。

## 当前 Agent

[`migration-rules.md`](../.agents/skills/htyf-migration/references/migration-rules.md)
是迁移规则的单一事实来源；[`SKILL.md`](../.agents/skills/htyf-migration/SKILL.md)
提供 Codex 的发现、调用和执行入口。两者共同用于把已有小程序、应用、Taro
项目或 Godot 游戏迁移到匹配的 HTYF 项目，并指导 AI 完成以下工作：

- 盘点源项目的页面、路由、状态、接口、资源和原生能力；
- 按功能逐项迁移并保持交互、异常状态和权限行为一致；
- 纯 React Native 应用仅使用允许的原生依赖；
- 纯 React Native 应用使用 React Navigation 路由和独立命名空间的 MMKV；
- 纯 React Native 应用的原生功能优先寻找 JS 方案，必须改 iOS/Android 源码时
  记录缺口并交由人工处理；
- 纯 React Native 应用的底部弹窗可使用 `@gorhom/bottom-sheet`，并保持在
  HTYF React 根树内；
- 记录源代码迁移基线；源 Git 或文件更新后，再次运行时增量同步最新变化；
- 为公共接口、复杂逻辑、平台适配、单位和降级路径补充完整且准确的代码注释；
- 正确适配 HTYF 胶囊区域、Safe Area、横竖屏及像素坐标；
- 补充坐标转换、矩形避让和页面布局测试；
- 未指定迁移目录时使用源项目下的 `HTYF/`，原有源文件保持不变；
- 使用 CLI 非交互命令生成对应官方模板，在模板中迁入源功能，无需再次确认下载；
- 迁移前识别 Godot 项目，选择 `game` 模板；已有迁移目标按基线增量更新；
- 保留游戏模板的 `_HTYF_SDK` 红糖云服 SDK 与 `HtyfSdk` 自动加载配置，并按
  Godot 视口坐标正确避让胶囊菜单。
- Godot 迁移目标固定为 4.7，项目导入、版本转换、测试、PCK 导出和宿主验收
  均使用 Godot 4.7。
- Godot 以移动端触控为主要交互环境；键盘移动需要映射为合适的触控交互，必要
  时评估纯 GDScript 虚拟摇杆，并在真机目标宿主验证多点触控和安全区布局。
- 非 Godot 项目在用户明确指定 Taro 时使用 `_taro_temp_`，并以 Taro 官方 RN
  开发指南及模板架构为准，不套用纯 React Native 应用规则。
- Taro 的 HTYF 专属业务文件使用 `.htyf.*`，应用和页面适配使用 `htyf` 字段；
  模板底层必须保留的 RN 转换器兼容配置不做机械替换。

完整规则只在迁移任务中按需加载，其他开发任务不会携带这份长上下文。

## 使用方法

1. 使用 Codex 打开本仓库。新建会话后，仓库 Skill 会出现在可用 Skill
   中；修改 Skill 后应重新启动会话以刷新发现结果。
2. 在提示词中明确源项目和本次迁移范围。目标目录可省略，默认使用
   `<源项目>/HTYF`；显式指定目标时以指定目录为准。
3. 要求 AI 先输出功能清单，再开始迁移。迁移结束后检查其完成报告、差异
   说明和测试结果。
4. AI 先检查 CLI 的 `--help`，再用 `init --non-interactive` 下载并生成
   对应模板。模板直接放入目标目录后，所有迁移、安装、构建和报告均在目标中
   完成；源代码盘点排除目标目录，避免递归迁移。

命令选择、`HTYF/` 大写目录处理、构建和 Godot 参数见
[CLI 迁移流程](../.agents/skills/htyf-migration/references/cli-workflow.md)。
本地 CLI 可能尚未发布，应优先验证工作区 `packages/cli/src/index.mjs` 的
能力，不能假设 npm 已发布版本支持新子命令。

省略目标目录的示例：

```text
使用 $htyf-migration，迁移当前项目的全部功能。使用 CLI 生成对应模板到
当前项目的 HTYF 目录，在模板中完成迁移，保留现有源项目文件。
```

Taro 迁移示例：

```text
使用 $htyf-migration，将 <非 Godot 源项目绝对路径> 迁移到 <目标绝对路径>，
明确使用 packages/cli/_taro_temp_。按 Taro 官方 React Native 开发注意事项
迁移，保留 Taro 路由、API、多端文件和构建方式；将 HTYF 专属的 .rn.* 文件
和 rn 配置适配为 .htyf.* 与 htyf 字段，不套用纯 RN 应用规则。
```

Godot 游戏迁移示例：

```text
使用 $htyf-migration，将 <Godot 源项目绝对路径> 迁移到 <目标绝对路径>。
先检查 project.godot、确认项目类型和源版本；迁移到 Godot 4.7 游戏模板，
保留 _HTYF_SDK 和 HtyfSdk 自动加载配置，按实际 Godot 视口适配胶囊菜单，
然后使用 Godot 4.7 完成 PCK 导出和目标宿主验证。
```

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
