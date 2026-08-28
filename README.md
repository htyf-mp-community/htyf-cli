# htyf-cli

让 **Taro 项目支持编译到红糖云服小程序**。

本仓库提供 Taro 4 平台插件、React Native 0.86+ 编译工具链和项目脚手架。开发者可以继续使用熟悉的 Taro + React + TypeScript 开发方式，在保留微信小程序、H5 等目标端的同时，新增 `htyf` 构建目标；也可以将同一项目自行构建为独立的 React Native App。

- 官网：[https://mp.dagouzhi.com/](https://mp.dagouzhi.com/)
- GitHub：[htyf-mp-community](https://github.com/htyf-mp-community)
- npm：[`@htyf-mp`](https://www.npmjs.com/org/htyf-mp)

## Taro 小程序快速开始

使用 CLI 创建项目：

```bash
npx @htyf-mp/cli
```

在交互菜单中选择“初始化新小程序项目”和 `taro-template`，然后启动红糖云服端开发构建：

```bash
cd <项目目录>
npm install
npm run dev:htyf
```

模板基于 Taro 4、React 和 TypeScript，已预置 `@htyf-mp/taro-plugin-platform` 及完整的 RN 编译依赖，无需手动组装工具链。

常用构建命令：

```bash
npm run dev:htyf     # 红糖云服小程序监听构建
npm run build:htyf   # 红糖云服小程序生产构建
npm run dev:weapp    # 微信小程序监听构建
npm run build:weapp  # 微信小程序生产构建
npm run dev:h5       # H5 监听构建
npm run build:h5     # H5 生产构建
```

红糖云服端使用 React Native 和 Metro，其他小程序及 H5 使用 Taro Webpack。模板已经处理两套构建链的 React 版本差异，业务代码应优先使用 React 18 和 React 19 共有的 API。

完整的模板配置、真机调试、发布流程和常见问题见 [Taro 模板文档](packages/cli/_taro_temp_/README.md)。

## React Native 0.86+ 与独立 App

Taro 模板当前基于 React Native 0.86，并保留完整的 `ios`、`android` 原生工程。项目既可以构建为红糖云服小程序资源，也可以按标准 React Native 流程调试和打包成独立 App：

```bash
npm run ios      # 运行 iOS App
npm run android  # 运行 Android App
```

发布独立 App 时，可分别通过 Xcode 和 Gradle 完成签名、归档与发布。升级到 React Native 0.86 以上版本时，需要同步检查 Expo、Re.Pack、Metro、原生依赖及 `@htyf-mp/*` 的兼容版本。

## 在现有 Taro 项目中接入

安装平台插件和所需的 `@htyf-mp/*` 运行时后，在 Taro 项目配置中注册插件：

```ts
export default defineConfig({
  plugins: [
    '@htyf-mp/taro-plugin-platform'
  ],
  htyf: {
    appName: 'apps',
    entry: 'app',
    output: {}
  }
})
```

随后可以使用 Taro CLI 编译红糖云服端：

```bash
taro build --type htyf
taro build --type htyf --watch
```

平台专属代码可通过 `process.env.TARO_ENV === 'htyf'` 判断；红糖云服扩展 API 通过 `Taro.htyf` 调用。

推荐从 `taro-template` 创建项目，以确保 React、React Native、Metro 和 `@htyf-mp/*` 的版本配套。现有项目接入细节见 [`@htyf-mp/taro-plugin-platform`](packages/taro-plugin-platform/README.md)。

## 其他项目模板

CLI 同时提供：

- `app-template`：React Native + Expo + Re.Pack 应用
- `game-template`：Godot 游戏

## CLI 命令

可以直接通过 npx 运行，也可以全局安装后使用 `htyf`：

```bash
npx @htyf-mp/cli

npm install --global @htyf-mp/cli
htyf
```

常用参数：

```bash
htyf --sync-deps    # 同步项目依赖版本
htyf --clean all    # 清理全部生成文件
htyf --clean build  # 清理 dist 构建产物
htyf --clean temp   # 清理 .htyf 临时目录
htyf --clean logs   # 清理日志
htyf --clean cache  # 清理缓存
htyf --debug        # 输出调试日志
htyf --help         # 查看帮助
```

更完整的 CLI、构建和真机调试说明见 [`packages/cli/README.md`](packages/cli/README.md)。

## 项目配置

CLI 从项目根目录的 `app.json` 读取 `htyf` 配置。常用字段包括：

- `type`：项目类型，可选 `app`、`game`、`web` 或 `plugin`
- `appid`：小程序唯一标识
- `name`：应用名称
- `version`：应用版本号
- `zipUrl`：构建产物地址
- `appUrlConfig`：线上配置地址

执行打包时，CLI 会提示确认新版本号、更新 `app.json`，并将资源输出到 `dist` 目录。

## AI Agent 辅助迁移

仓库提供 `$htyf-migration` Codex Skill。Codex 可以根据 HTYF 迁移任务自动
调用，也可以由用户显式调用，并读取迁移流程、React Navigation 与 MMKV
约束、原生依赖限制、页面树内覆盖层、胶囊与 Safe Area 适配要求以及测试
验收标准。

使用时向 AI 提供源项目路径、目标 `htyf` 路径和迁移范围，例如：

```text
使用 $htyf-migration，将 /path/to/source 的全部功能迁移到
/path/to/htyf。先生成迁移清单，再逐项实现并运行测试。
```

详细说明和更多提示词见 [HTYF AI Agent 使用说明](agents/README.md)。

## 本地开发

### 环境要求

- Node.js 18 或更高版本
- pnpm 9 或更高版本

### 安装依赖

```bash
git clone https://github.com/htyf-mp-community/htyf-cli.git
cd htyf-cli
pnpm install
```

### 常用脚本

```bash
pnpm build            # 构建所有包含 build 脚本的包
pnpm test             # 运行所有包的测试
pnpm clean            # 清理所有包的构建产物
pnpm sync-deps        # 预览依赖版本同步结果
pnpm sync-deps:write  # 写入依赖版本同步结果
pnpm sync-deps:watch  # 监听并同步依赖版本
```

## 仓库结构

```text
packages/
├── cli/                         # 项目脚手架和管理 CLI
├── taro-plugin-platform/        # Taro 的 htyf 平台插件
├── taro-rn-runner/              # React Native 编译入口
├── taro-rn-supporter/           # Metro、入口文件和构建支撑
├── taro-rn-transformer/         # Taro RN 入口转换器
├── taro-rn-style-transformer/   # RN 样式转换器
├── taro-rn/                     # Taro RN API
├── taro-runtime-rn/             # RN 运行时
├── taro-router-rn/              # RN 路由
├── taro-components-rn/          # RN 基础组件
├── css-to-react-native/         # CSS 到 RN 样式转换
├── stylelint-taro-rn/           # RN 样式检查规则
└── stylelint-config-taro-rn/    # RN Stylelint 共享配置
```

各包的详细用法请查看对应目录中的 README：

- [`@htyf-mp/taro-plugin-platform`](packages/taro-plugin-platform/README.md)
- [`@htyf-mp/taro-rn-runner`](packages/taro-rn-runner/README.md)
- [`@htyf-mp/taro-rn-transformer`](packages/taro-rn-transformer/README.md)
- [`@htyf-mp/taro-rn-style-transformer`](packages/taro-rn-style-transformer/README.md)
- [`@htyf-mp/taro-rn`](packages/taro-rn/README.md)
- [`@htyf-mp/taro-router-rn`](packages/taro-router-rn/README.md)
- [`@htyf-mp/taro-components-rn`](packages/taro-components-rn/README.md)
- [`@htyf-mp/taro-rn-supporter`](packages/taro-rn-supporter/README.md)
- [`@htyf-mp/taro-css-to-react-native`](packages/css-to-react-native/README.md)
- [`@htyf-mp/stylelint-taro-rn`](packages/stylelint-taro-rn/README.md)
- [`@htyf-mp/stylelint-config-taro-rn`](packages/stylelint-config-taro-rn/README.md)

## 版本与发布

根包为私有包，不会发布到 npm。维护者可使用以下命令统一管理 `packages/*` 中的公开包：

```bash
pnpm version:patch
pnpm version:minor
pnpm version:major
pnpm publish:changed   # 查看发生变化的包
pnpm publish:dev       # 使用 alpha 标签发布
pnpm publish:packages  # 构建并正式发布
```

## License

各公开包遵循 [MIT License](https://opensource.org/license/mit)。
