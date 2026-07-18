# 红糖云服小程序 Taro 模板

基于 [Taro](https://taro-docs.jd.com/) 的多端项目模板，支持 **红糖云服（HTYF）** 与微信等小程序、H5 等平台，一套代码多端运行。

## 技术栈

- Taro 4.x + React + TypeScript + Less
- 红糖云服：`@htyf-mp/*`（React Native / Metro）
- 小程序 / H5：`@tarojs/*`（Webpack）

## React 版本说明

红糖云服与 Taro 其它端对 React 版本要求不同，本项目通过 **双版本依赖 + 打包 alias** 方案共存：

| 平台 | 构建工具 | React 版本 | 说明 |
|------|----------|------------|------|
| `htyf`（红糖云服） | Metro | **19.x** | `@htyf-mp/*` 要求 React 19+ |
| 小程序 / H5 等 | Webpack | **18.x** | `@tarojs/*` 要求 React 18+ |

### 依赖配置（`package.json`）

```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-19": "npm:react@19.2.3"
  },
  "resolutions": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

- `react` / `react-dom`：默认安装 React 18，供 Webpack 构建使用
- `react-19`：通过 npm alias 额外安装 React 19，供红糖云服使用
- `resolutions`：防止 `@htyf-mp/*` 等依赖将顶层 `react` 提升到 19

### 红糖云服 → React 19（`babel.config.js`）

HTYF / RN 构建时，通过 `babel-plugin-module-resolver` 将 `react` 解析到 `react-19`：

```js
if (process.env.TARO_ENV === 'rn' || process.env.TARO_ENV === 'htyf') {
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            react: './node_modules/react-19',
          },
        },
      ],
    ],
  }
}
```

### 小程序 / H5 → React 18（`config/react-alias.ts`）

在 `config/index.ts` 的 `mini`、`h5` 的 `webpackChain` 中调用 `applyReact18Alias()`，固定 Webpack 使用 React 18。

## 常用命令

```bash
# 安装依赖
yarn install

# 红糖云服开发（React 19）
yarn dev:htyf

# 微信小程序开发（React 18）
yarn dev:weapp

# H5 开发（React 18）
yarn dev:h5
```

## 备注

1. 执行 `yarn install` 时，`@htyf-mp/*` 可能提示 `react@19.2.3` 的 peer dependency 警告，属正常现象；红糖云服构建时会通过 `babel.config.js` 的 alias 使用 `react-19`。
2. 业务代码应使用 **React 18 / 19 共有的 API**，避免使用仅 React 19 才有的特性，以保证多端兼容。
3. 升级 React 版本时，需同步更新 `react`、`react-19` 及 `resolutions` 中的版本号，并分别验证红糖云服与小程序 / H5 构建。
