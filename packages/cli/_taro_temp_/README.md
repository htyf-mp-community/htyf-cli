# 红糖云服小程序 Taro 模板

基于 [Taro 4](https://docs.taro.zone/) 的多端项目模板。一套 React + TypeScript 代码可编译到红糖云服（HTYF）、微信等小程序及 H5。

- 红糖云服官网：[https://mp.dagouzhi.com/](https://mp.dagouzhi.com/)
- 红糖云服端使用 React Native、Metro 和 `@htyf-mp/*` 工具链
- 其他小程序及 H5 使用 Taro 和 Webpack

## 快速开始

建议使用 Node.js 18 或更高版本。

```bash
# 安装依赖
npm install

# 启动红糖云服端开发构建
npm run dev:htyf
```

执行红糖云服端命令后，根据菜单选择：

- `红糖小程序 - 本地开发`：启动监听构建，代码变更后自动更新
- `红糖小程序 - 真机调试`：生成调试资源并启动调试服务
- `红糖小程序 - 打包小程序`：生成用于发布的资源包
- `同步依赖版本`：同步 `@htyf-mp/*` 等依赖版本

首次构建时，平台插件会在项目根目录生成 `htyf.config.json`。

## 红糖云服应用配置

项目根目录的 `htyf.config.json`文件

```json
{
  "miniprogramRoot": "dist/",
  // 应用名
  "name": "_taro_temp_",
  // 简介
  "description": "htyf",
  // appid
  "appid": "wx565635841f9879d3",
  // 资源域名 打包后资源可访问的域名
  "assetsHost": "https://assets.htyf.com"
}
```

字段说明：

- `type`：应用类型，Taro 模板使用 `app`
- `name`：项目名称
- `projectname`：在红糖云服 App 中展示的名称
- `appid`：应用唯一标识，创建后不应随意修改
- `rotate`：屏幕方向，默认为 `portrait`
- `appUrlConfig`：线上 `app.json` 地址
- `zipUrl`：线上资源包地址，`[PLATFORM]` 会按目标平台替换
- `version`：发布版本号，首次打包或后续升级时由 CLI 写入

发布前请将示例域名替换为实际可访问的 HTTPS 地址。

## Taro 平台配置

模板已在 `config/index.ts` 中启用红糖云服平台插件：

```ts
export default defineConfig({
  plugins: [
    '@tarojs/plugin-generator',
    '@htyf-mp/taro-plugin-platform'
  ],
  htyf: {
    appName: 'apps',
    entry: 'app',
    output: {}
  }
})
```

常用配置：

- `appName`：构建应用名称
- `entry`：Taro 入口名称，默认使用 `app`
- `output`：传递给红糖云服端构建工具的输出配置
- `alias`：红糖云服端专用模块别名
- `postcss.cssModules`：CSS Modules 配置

页面路由、窗口样式等 Taro 应用配置仍在 `src/app.config.ts` 中维护。

## 平台专属文件

红糖云服端构建会按文件名后缀解析平台专属实现。业务代码仍按原路径引用（例如 `import './index'` 或 `import './index.less'`），构建工具自动选择对应文件。

支持的后缀（以 `index` 为例）：

| 文件 | 说明 |
| --- | --- |
| `index.ios.ts` / `index.android.ts` | 仅对应原生平台 |
| `index.htyf.ts` / `index.htyf.tsx` | 红糖云服端专用 |
| `index.rn.ts` / `index.rn.tsx` | React Native 通用实现 |
| `index.ts` / `index.tsx` | 默认实现（小程序、H5 等） |

样式文件同样支持，例如 `index.htyf.less`、`index.rn.scss`。

解析优先级（同时存在多个候选时，取更高优先级）：

1. 平台专属：`.ios` / `.android`（以及当前构建目标平台）
2. `.htyf`
3. `.rn`
4. 无平台后缀的默认文件

因此，当 `index.htyf.tsx` 与 `index.rn.tsx` 同时存在时，红糖云服端会优先使用 `.htyf` 版本。

模板中的示例：

```text
src/components/Button/
  index.tsx          # 默认（小程序 / H5）
  index.less
  index.htyf.tsx     # 红糖云服端优先使用
  index.htyf.less
```

引用时无需写后缀：

```ts
import { Button2 } from '@/components/Button'
```

建议：仅在红糖云服端与其他端实现差异较大时新增 `.htyf` 文件；若实现可与通用 RN 共用，使用 `.rn` 即可。

## 开发、调试与发布

### 本地开发

```bash
npm run dev:htyf
```

选择“本地开发”后会启动 Metro 监听构建。业务代码可通过环境变量进行平台判断：

```ts
if (process.env.TARO_ENV === 'htyf') {
  // 仅红糖云服端执行的逻辑
}
```

### 真机调试

再次执行 `npm run dev:htyf`，选择“真机调试”。CLI 会构建调试资源、更新调试地址并启动本地服务。手机与开发电脑需要处于可互相访问的网络环境中，防火墙也应允许对应端口访问。

### 打包发布

```bash
npm run build:htyf
```

选择“打包小程序”后，CLI 会：

1. 读取 `app.json` 中的 `htyf` 配置。
2. 提示输入版本号，默认在当前版本上递增补丁版本。
3. 执行生产构建并生成资源包。
4. 将更新后的配置和构建产物写入 `dist`。

构建完成后，将 `dist` 中的配置及资源上传到 `appUrlConfig`、`zipUrl` 对应的位置，再通过红糖云服 App 验证发布结果。

## 红糖云服专用 API

跨端 API 继续从 `@tarojs/taro` 引入。红糖云服扩展 API 位于 `Taro.htyf`：

```ts
import Taro from '@tarojs/taro'

Taro.htyf.test({})
  .then((result) => {
    console.log(result)
  })
```

调用扩展 API 前建议先做平台判断，并以红糖云服客户端实际提供的 API 为准。

## React 版本兼容

红糖云服端和其他 Taro 端使用不同的 React 版本：

- 红糖云服端：顶层 `react`，当前为 React 19，由 Metro 构建
- 微信等小程序及 H5：`react-18` npm alias，当前为 React 18，由 Webpack 构建

`config/index.ts` 会在非 RN/HTYF 构建中把 `react` 映射到 `node_modules/react-18`；`babel.config.js` 则在 RN/HTYF 构建中使用 React Native 官方 preset。

业务代码应尽量使用 React 18 和 React 19 共有的 API。升级 React 时，需要同步检查 `react`、`react-18`、`react-dom`、`@types/react` 及相关 alias，并分别验证红糖云服、小程序和 H5 构建。

## 其他平台命令

```bash
npm run dev:weapp    # 微信小程序监听构建
npm run build:weapp  # 微信小程序生产构建
npm run dev:h5       # H5 监听构建
npm run build:h5     # H5 生产构建
```

其他已配置平台请查看 `package.json` 中的 `scripts`。

## 常见问题

- 安装时出现 React peer dependency 警告：先确认依赖版本与模板一致，再分别验证 HTYF 和目标 Taro 端；不要直接删除双 React 配置。
- 真机无法连接：检查手机和电脑网络是否互通、调试地址是否使用电脑局域网 IP，以及系统防火墙是否放行服务端口。
- 构建提示缺少 `app.json`：确认项目由 `@htyf-mp/cli` 创建，或按上面的结构补充 `htyf` 配置。
- 多端表现不一致：优先检查平台判断、React 版本差异及 React Native 不支持的 Web 样式。
