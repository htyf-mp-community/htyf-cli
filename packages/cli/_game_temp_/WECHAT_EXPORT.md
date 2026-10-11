# 微信小游戏导出（AnranS）

微信导出使用 [AnranS/godot_for_minigame](https://github.com/AnranS/godot_for_minigame) **v0.2.1 发布版**，配套 **官方 Godot 4.6.1 stable**。不混用主分支 v0.3.0、Godot 4.7 或 godothub 的运行模板。

## 命令导出（推荐）

1. 下载 [官方 Godot 4.6.1](https://github.com/godotengine/godot-builds/releases/tag/4.6.1-stable)，使用非 Mono 版本。
2. 修改 `wechat-export.json` 中的微信小游戏 `appid`、`orientation` 和输出目录；也可通过环境变量 `WECHAT_APPID` 覆盖 AppID。它与红糖云服 `app.json` 的 appid 独立。
3. 执行：

   ```sh
   GODOT_WECHAT_BIN=/path/to/Godot-4.6.1 npm run export:wechat
   ```

   macOS 本机已准备 `.htyf/tools/godot-4.6.1/Godot.app`，可直接执行 `npm run export:wechat`。新生成的项目不包含该编辑器，需要自行下载。Windows PowerShell 先设置 `$env:GODOT_WECHAT_BIN = 'C:\path\Godot-4.6.1.exe'`。
4. 在微信开发者工具中**新建导入 `dist/wechat-anrans`**，选择小游戏，重新编译并预览真机。旧方案及其对照导出目录已清理，只保留 AnranS 微信导出。

导出脚本复制当前游戏到临时目录，在副本中使用 4.6.1 重新导入全部资源，设置 Compatibility 渲染器并移除 Godot AI 编辑器辅助 autoload，然后调用 AnranS 原始导出器。原工程的 4.7 导入缓存、场景、脚本及 Android/iOS 渲染配置不受副本处理影响。SDK autoload `MiniGameSDK` 随游戏资源导出；编辑器插件、引擎模板和适配 JS 不重复塞入资源包。

AnranS 导出器会校验引擎身份及 SHA-256，并事务发布。命令保留微信开发者工具写入的项目配置，刷新这两份 JSON 的哈希；游戏及运行时文件的改动仍会阻止覆盖。命令还检查最终文件哈希与加载路径。输出包含 `game.js`、`game.json`、`project.config.json`、`js/libs/godot.js`、`engine/godot.wasm.br`、`engine/godot.zip` 和 `.godot-mini-game-export.json`。`engine/godot.zip` 是当前游戏资源包，不是示例游戏。

## 编辑器面板

插件已在原项目启用。在 **4.6.1** 编辑器的 Mini Game Export 面板中选择 WeChat、填写 AppID、选择“微信小游戏”Web 预设并导出。原工程仍标记为 4.7，推荐使用上述命令在隔离副本导出。面板要求输出目录在项目之外且为空或由它管理；不能直接对原项目内的 `dist` 使用面板导出。单独点击 Godot 的 Web 导出不会生成完整微信工程。

## 运行边界与真机验证

- 发布版引擎 profile 是 `2d_full`，禁止 SIMD、线程和 WASM exception tags；此集成按 2D 游戏验证。
- Godot 4.7 专有语法或资源可能无法由 4.6.1 读取，导出出现此类错误需逐项处理，不能用 4.7 PCK 配 4.6.1 WASM。
- `_HTYF_SDK` 仍依赖 RN 宿主 IPC。AnranS 提供 `MiniGameSDK` 微信接口，但本次更换导出引擎不会自动把 HTYF 的登录、支付、弹窗等接口映射到微信。主场景显示与 RN SDK 按钮功能应分开验证。
- 完成本地导出、哈希和资源验证不代表 iOS 真机问题已解决。请在此前出错的同一台手机上检查启动、中文、触摸、音频和切后台恢复，并提供第一条红色日志。

## 锁定与许可证

- 发布版：v0.2.1，提交 `a50e907`。
- 发布 ZIP SHA-256：`8f0cc36a925f828a980126cb19e864bfd4b79d0cd443412718e090a5089d552f`。
- Godot：`4.6.1.stable`，源码提交 `14d19694e0c88a3f9e82d899a0400f27a24c176e`。
- Emscripten：4.0.3；profile：2d_full；模板 revision：1；Bridge ABI：1。
- 插件使用 MIT；保留 `addons/godot_mini_game/LICENSE`、`THIRD_PARTY_NOTICES.md` 和 `GODOT_COPYRIGHT.txt`。
- 插件代码与运行模板来自发布包。引擎 JS/WASM 保持原始版本及哈希；本地仅修正 `templates/common/adapter.js` 和 `templates/common/js/loader.js` 的高分屏画布尺寸。原 godothub 插件、辅助脚本及旧微信导出已清理。

## 高分屏清晰度修正

上游 v0.2.1 适配层将 `devicePixelRatio` 固定为 1，加载器将主画布设为逻辑尺寸，高分屏会把低分辨率画面放大。本地适配层恢复平台 `pixelRatio`，主画布使用 `逻辑尺寸 × 像素比`；`clientWidth/Height`、`getBoundingClientRect()` 及触摸事件仍使用逻辑像素，Godot 输入桥仅按画布比例转换一次。加载器不再将主画布降回逻辑尺寸，窗口变化时也同步物理分辨率。

`node --test tools/tests/*.test.mjs` 覆盖像素比 1/2/3 的适配层、加载器、窗口变化及实际引擎触摸换算，并校验原始引擎哈希。真机已由用户确认可启动；清晰度修正后的视觉效果与触摸仍需在同一手机复测。
