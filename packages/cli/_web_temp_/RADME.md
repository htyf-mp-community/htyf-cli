## Web 应用说明

本目录下的项目是一个 **Web 应用小程序模版**，用于在 **红糖云服 App** 中通过内嵌 WebView 运行。

- 官方网站：[`https://mp.dagouzhi.com/`](https://mp.dagouzhi.com/)
- GitHub 组织：[`https://github.com/htyf-mp-community`](https://github.com/htyf-mp-community)

通过配置 `app.json` 与打包命令，可以生成供他人使用和远程更新的 Web 包。

### 配置说明（app.json）

- **webUrl**
  - 指定小程序 / 客户端要加载的网页地址。
  - 示例：`"webUrl": "https://example.com/miniapp"`。
  - 修改这里即可切换小程序指向的实际网页。

- **appUrlConfig**
  - 配置应用自身的配置 / 元数据地址（如配置文件、版本信息等）。
  - 一般为可访问的 HTTP(S) 地址或接口，客户端通过它获取应用元数据。

- **zipUrl**
  - 指定 Web 静态资源压缩包（zip）的下载地址，用于分发和更新。
  - 只要更新此 zip 包并上传到这里配置的地址，客户端即可拉取最新资源。

> 记忆小贴士：  
> - `webUrl`：跑的是哪个“网页”。  
> - `appUrlConfig`：从哪儿拿“配置”。  
> - `zipUrl`：从哪儿拿“静态资源包”。

### app.json 字段总览

下面是 `app.json` 的完整结构（示意）以及各字段的含义：

```ts
{
  /**
   * 应用类型
   * 1. app: 小程序
   * 2. game: 小游戏
   * 3. web: H5/WebView 小程序（本模版）
   * 4. plugin: 插件
   */
  type: 'app' | 'game' | 'web' | 'plugin';
  /** appid，小程序在红糖云服中的唯一 ID */
  appid: string;
  /**
   * 横竖屏配置
   * - undefined/null: 默认竖屏
   * - 'auto': 自动随系统竖/横屏
   * - 'landscape': 横屏
   * - 'portrait': 竖屏
   */
  rotate?: 'auto' | 'landscape' | 'portrait';
  /** 应用图标地址 */
  icon?: string;
  /** 应用名称（展示名称） */
  name: string;
  /** 资源地址（静态资源 zip 包） */
  zipUrl: string;
  /** 版本号 */
  version: string;
  /** 线上配置地址（如 app.json 配置接口） */
  appUrlConfig: string;
  /** H5 应用地址（仅 type='web' 时必填） */
  webUrl?: string;
  /** 引擎版本（如 web-sdk@x.x.x） */
  engines: string;
}
```

- 对于 **Web 模版**（`type: 'web'`）：
  - 建议必填：`type`、`appid`、`name`、`zipUrl`、`version`、`appUrlConfig`、`webUrl`、`engines`。
  - 可选：`rotate`（横竖屏）、`icon`。
  - 客户端会先访问 `appUrlConfig` 获取最新配置，再根据 `webUrl` / `zipUrl` 决定是加载线上网页还是本地打包的 H5 资源。

### app.js 的作用

- `app.js` 是 **Web 小程序在红糖云服中的入口脚本**：
  - 负责根据 `app.json` / `webUrl` / `zipUrl` 决定加载哪一个网页或本地打包资源。
  - 将页面挂载到容器提供的 WebView 中，并与宿主 App 进行通信（如获取用户信息、环境参数等）。
  - 可按需实现小程序级别的生命周期逻辑（如首次进入、从后台回到前台时的初始化 / 恢复）。
- 对于前端开发者而言，可以把 `app.js` 理解为：**连接网页代码与红糖云服小程序容器的“桥梁”入口**。

### 打包与真机测试（红糖云服 App）

- **打包 / 真机高试命令**  
  在本仓库根目录执行：

```bash
npm run htyf
```

- 作用：
  - 构建当前 Web 应用。
  - 生成供红糖云服 App 真机高试 / 分发使用的资源包。

### 推荐工作流

1. 修改 `webUrl` 指向你的线上 / 测试网页。
2. 在 `app.json` 中配置好 `appUrlConfig` 和 `zipUrl`，约定给团队或外部使用方：
   - 从哪拉配置（`appUrlConfig`）。
   - 从哪下载资源包（`zipUrl`）。
3. 完成页面和资源开发后，运行 `npm run htyf` 进行打包。
4. 将生成的资源上传到 `zipUrl` 对应位置，保证别人可以通过更新 zip 包来获取最新版本。



