# HTYF CLI

红糖云服项目的初始化、资源打包、真机调试、清理和依赖同步工具。

## 创建项目

```sh
npx --yes @htyf-mp/cli --help
npx --yes @htyf-mp/cli init --non-interactive --name my-app --display-name 我的应用 --template app
cd my-app
npm install
npx --yes @htyf-mp/cli build --non-interactive --version 1.0.0 --platform ios
npx --yes @htyf-mp/cli debug --non-interactive --platform ios
```

先检查所用版本的 `--help`。源码功能未发布时，可用 `node /absolute/path/to/htyf-cli/packages/cli/src/index.mjs` 替代命令入口。直接运行 `htyf` 可打开交互菜单。

## 仓库分工

| 仓库 | 内容 |
| --- | --- |
| [htyf-cli](https://github.com/htyf-mp-community/htyf-cli) | CLI；`packages/cli/_apps_temp_` RN 模板；`packages/cli/_game_temp_` Godot 模板 |
| [htyf-taro](https://github.com/htyf-mp-community/htyf-taro) | Taro 平台插件、组件、运行时、样式工具与示例 |
| [htyf-skills](https://github.com/htyf-mp-community/htyf-skills) | AI 全量／增量迁移规则与安装器 |

`--template app` 创建 RN 项目；`--template game` 创建 Godot 游戏；`--template taro` 从独立 Taro 仓库创建跨端项目。已有 Web 项目的构建流程仍保留，但当前初始化菜单不提供 Web 模板。

## 自动化命令

| 命令 | 用途 |
| --- | --- |
| `init --name my-app --display-name 我的应用 --template app` | 在当前目录下生成新项目 |
| `build --version 1.0.0 --platform ios` | 构建并输出资源包 |
| `debug --platform ios` | 启动真机调试服务，需持续运行 |
| `sync-deps` | 将项目已有依赖同步到 CLI 配套版本；之后重新安装 |
| `clean build` | 删除当前目标的构建产物 |

自动化附加 `--non-interactive`；使用 `--project /absolute/project` 指定目标。构建首次需提供版本，已有有效版本时可省略 `--version`。Godot 支持 `--godot-bin`、`--godot-project` 和 `--godot-preset`，具体以 `--help` 为准。Taro 先使用模板内的 `build:htyf` 构建命令。

## AI 迁移

安装 [htyf-skills](https://github.com/htyf-mp-community/htyf-skills) 后，在源项目调用 `$htyf-migration`。AI 会盘点功能、生成对应模板、迁移并核对功能清单；后续可按源代码基线增量同步。技能与 CLI 独立维护，安装 CLI 不会自动安装技能。

## 开发与验证

```sh
pnpm install
pnpm --filter @htyf-mp/cli test
pnpm test:packages
pnpm verify:packages
```

Taro 包已移至独立仓库，不再参与本仓库的 Lerna 版本和发布流程。
