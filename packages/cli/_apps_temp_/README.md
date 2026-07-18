## React Native 应用小程序说明

本目录下的项目是一个 **基于 React Native 的应用小程序模版**，用于在 **红糖云服 App** 中运行。

- 官方网站：[`https://mp.dagouzhi.com/`](https://mp.dagouzhi.com/)
- GitHub 组织：[`https://github.com/htyf-mp-community`](https://github.com/htyf-mp-community)

通过配置 `app.json` 与打包命令，可以将本应用发布到红糖云服 App，供他人体验和远程更新。

### 开发环境准备

- **安装依赖**
  在仓库根目录或本目录（视项目脚本而定）执行：

```bash
yarn
```

用于安装 React Native 工程及相关工具依赖。

- **React Native 开发**
  - 按标准 React Native 开发流程进行：
    - 在本目录进行 JS/TS 代码开发。
    - 调试方式与普通 RN 项目一致（Metro、调试工具等）。

### 资源地址配置（app.json）

通过修改 `app.json` 中的字段，让别人可以拉取和更新你的应用资源：

- **appUrlConfig**
  - 指定应用配置 / 元数据地址（如版本号、更新说明等）。
  - 一般为 HTTP(S) 接口或静态 JSON 配置地址。

- **zipUrl**
  - 指定应用静态资源压缩包（zip）的下载地址。
  - 他人只需按约定更新此 zip 包，即可完成分发或在线更新。

> 记忆小贴士：  
> - `appUrlConfig`：从哪儿拿“配置”。  
> - `zipUrl`：从哪儿拿“代码资源包”。

### app.json 字段总览

下面是 `app.json` 的完整结构（示意）以及各字段的含义：

```ts
{
  /**
   * 应用类型
   * 1. app: 小程序（本模版）
   * 2. game: 小游戏
   * 3. web: H5/WebView 小程序
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
  /** H5 应用地址（仅 type='web' 时有意义） */
  webUrl?: string;
  /** 引擎版本（如 react-native@0.7x.x） */
  engines: string;
}
```

- 对于 **应用模版**（`type: 'app'`）：
  - 建议必填：`type`、`appid`、`name`、`zipUrl`、`version`、`appUrlConfig`、`engines`。
  - 可选：`rotate`（横竖屏）、`icon`、`webUrl`（一般不用）。
  - 客户端会先访问 `appUrlConfig` 获取最新配置，再根据配置或本地的 `zipUrl` 加载 React Native 资源包。

### app.js 的作用

- `app.js` 是 **React Native 应用小程序的入口文件**：
  - 导出整个小程序的根组件（通常包含导航、Tab、路由等）。
  - 负责初始化红糖云服相关能力（如从宿主 App 读取上下文、用户信息等）。
  - 按需监听小程序生命周期（如进入前台 / 后台）并做状态恢复。
- 红糖云服会以 `app.js` 导出的组件作为运行入口，将其挂载到容器中。

### 在红糖云服 App 上体验 / 真机高试

当你希望在红糖云服 App 内体验或给他人真机测试时，可通过打包命令生成资源包：

```bash
npm run htyf
```

- 会打包当前 React Native 应用小程序资源。
- 生成供红糖云服 App 拉取的分发 / 高试包。

### 推荐工作流

1. 使用 React Native 正常开发、调试应用代码。
2. 在 `app.json` 中配置好 `appUrlConfig`、`zipUrl`，约定给其他人使用和更新的地址。
3. 需要在红糖云服 App 上体验或对外发版时，执行 `npm run htyf` 完成打包。
4. 将生成的 zip 资源上传到 `zipUrl` 对应位置，他人即可通过该地址获取或更新应用资源。


