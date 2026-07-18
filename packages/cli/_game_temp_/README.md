## Godot 游戏小程序说明

本目录下的项目是一个 **基于 Godot 的游戏小程序模版**，用于在 **红糖云服 App** 中运行。

- 官方网站：[`https://mp.dagouzhi.com/`](https://mp.dagouzhi.com/)
- GitHub 组织：[`https://github.com/htyf-mp-community`](https://github.com/htyf-mp-community)

通过配置 `app.json` 与打包命令，可以将本游戏发布到红糖云服 App，供他人体验和远程更新。

### 开发环境准备

- **安装依赖**
  在仓库根目录或本目录（视项目脚本而定）执行：

```bash
yarn
```

用于安装构建 / 工具相关依赖。

- **Godot 开发**
  - 使用 Godot 编辑器打开 `_game_temp_` 对应项目：
    - 修改场景、脚本（如 `demo.gd`、`godot-sdk.gd` 等）。
  - 所有游戏逻辑、UI 开发流程与普通 Godot 项目一致。

### 资源地址配置（app.json）

通过修改 `app.json` 中的字段，让别人可以拉取和更新你的游戏资源：

- **appUrlConfig**
  - 指定游戏配置 / 元数据地址（例如版本号、更新说明等）。
  - 一般为 HTTP(S) 接口或静态 JSON 配置地址。

- **zipUrl**
  - 指定游戏静态资源压缩包（zip）的下载地址。
  - 他人只需按约定更新该 zip 包，即可完成分发或在线更新。

> 记忆小贴士：  
> - `appUrlConfig`：从哪儿拿“配置”。  
> - `zipUrl`：从哪儿拿“游戏资源包”。

### app.json 字段总览

下面是 `app.json` 的完整结构（示意）以及各字段的含义：

```ts
{
  /**
   * 应用类型
   * 1. app: 小程序
   * 2. game: 小游戏
   * 3. web: H5/WebView 小程序
   * 4. plugin: 插件
   */
  type: 'app' | 'game' | 'web' | 'plugin';
  /** appid */
  appid: string;
  /**
   * 横竖屏配置
   * - undefined/null: 默认竖屏
   * - 'auto': 自动随系统竖/横屏
   * - 'landscape': 横屏
   * - 'portrait': 竖屏
   */
  rotate?: 'auto' | 'landscape' | 'portrait';
  /** 应用图标 */
  icon?: string;
  /** 应用名称 */
  name: string;
  /** 资源地址（静态资源 zip 包） */
  zipUrl: string;
  /** 版本号 */
  version: string;
  /** 线上配置地址 */
  appUrlConfig: string;
  /** H5 应用地址（仅 type='web' 时有意义） */
  webUrl?: string;
  /** 引擎版本（如 godot@4.x.x） */
  engines: string;
}
```

- 对于 **游戏模版**（`type: 'game'`）：
  - 建议必填：`type`、`appid`、`name`、`zipUrl`、`version`、`appUrlConfig`、`engines`。
  - 可选：`rotate`（横竖屏）、`icon`、`webUrl`（一般不用）。
  - 客户端会按 `appUrlConfig` 拉取最新配置，再根据配置中的 `zipUrl` / 本地 `zipUrl` 加载游戏资源。

### app.js 的作用

- 对于 Godot 游戏小程序，`app.js` 是在 **红糖云服 App 中嵌入游戏的入口脚本**：
  - 负责根据 `app.json` / `zipUrl` 加载打包好的 Godot 游戏资源。
  - 在容器中创建并挂载 Godot 运行视图（例如嵌入到 React Native 页面或原生视图中）。
  - 响应宿主 App 的生命周期事件（暂停、恢复、销毁），并转发给 Godot 游戏。
- 简单理解：**Godot 负责“怎么画游戏”，`app.js` 负责“怎么把游戏塞进红糖云服 App 并跑起来”**。

### 在 App 上体验 / 真机高试

当你希望在 App 端体验或给他人真机测试时，可以通过打包命令生成资源：

```bash
npm run htyf
```

- 作用：
  - 打包当前 Godot 游戏小程序的资源。
  - 产出供 App 真机高试 / 分发使用的包。

### 推荐工作流

1. 使用 Godot 正常开发、调试游戏内容。
2. 修改 `appUrlConfig`、`zipUrl`，约定好给其他人使用和更新的地址。
3. 需要在 App 上体验或对外发版时，执行 `npm run htyf` 完成打包。
4. 上传生成的 zip 资源到 `zipUrl` 对应位置，他人即可通过该地址获取或更新游戏资源。

