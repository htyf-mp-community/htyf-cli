## 红糖云服小程序模板 CLI

用于创建和管理 **红糖云服 App 小程序** 项目（应用 / 游戏 / Web / 插件），包含：

- 初始化小程序项目模版
- 构建小程序资源包（打包）
- 启动真机调试服务
- 清理构建产物与临时文件

- 官网：[`https://mp.dagouzhi.com/`](https://mp.dagouzhi.com/)
- GitHub：[`https://github.com/htyf-mp-community`](https://github.com/htyf-mp-community)

## 安装与快速开始

建议直接使用 npx：

```bash
npx @htyf-mp/cli
```

按照交互提示完成：

1. **输入应用目录名**（例如 `my-htyf-mp`，用于创建项目文件夹）。
2. **输入应用显示名称**（2–10 个中文/字母/数字）。
3. **选择模板类型**：
   - `app-template`：React Native 应用小程序（对应 `type: 'app'`）。
   - `game-template`：Godot 游戏小程序（对应 `type: 'game'`）。
   - `taro-template`：Taro 小程序模板。
4. 选择模板仓库镜像（当前默认使用 GitHub）。

CLI 会自动：

- 克隆官方模版仓库到临时目录。
- 清理无关模版，仅保留所选模板。
- 生成 `app.json` 中的 `htyf` 配置（包含 `appid`、`name`、`zipUrl`、`appUrlConfig` 等）。
- 将模板拷贝到你指定的项目目录中。

> 各模板的具体用法，请参考生成项目中 `_apps_temp_` / `_game_temp_` / `_taro_temp_` 目录下的 `README.md`。

## AI / 脚本直接调用

不带子命令时保留交互菜单；以下子命令均为非交互模式，不需要模拟按键或逐步回答问题。`--non-interactive` 可显式标注自动化调用。无终端且未指定命令时立即报错，不会挂起等待输入。

```bash
# 创建项目，--project 指定父目录；不会自动安装依赖
htyf init --name my-app --display-name 我的应用 --template taro --project ./workspace

# 构建，显式设置并写入 app.json 的 htyf.version
htyf build --project ./workspace/my-app --version 1.2.3 --platform ios

# 省略 --version 时使用现有版本，不自动递增
htyf build --project ./workspace/my-app
htyf debug --project ./workspace/my-app

# Godot 项目（项目根目录包含 project.godot）
htyf build --project ./my-game --version 1.0.0 --platform android \
  --godot-bin /path/to/godot --godot-preset Android

# 指定清理范围；省略范围为 all，直接执行清理
htyf clean build --project ./workspace/my-app
htyf sync-deps --project ./workspace/my-app
htyf --help
```

可将 `htyf` 替换为 `npx @htyf-mp/cli` 或 `htyf-mp`。初始化必须提供 `--name`、`--display-name`、`--template`；模板支持 `taro`、`app`、`game` 及对应的 `*-template` 全名。目标目录已存在时失败，不覆盖项目。

`--project` 默认当前目录，其他相对路径基于此目录解析。Godot 支持 `--godot-project` 指定内部项目目录；可执行文件依次取 `--godot-bin`、`GODOT_EDITOR`、缓存、内置默认路径，不可执行时立即失败。预设默认随平台选择 `iOS` 或 `Android`。

成功退出码为 `0`，参数或执行失败为 `1`；输出为人类可读日志，构建完成输出产物路径。`debug` 为持续运行的调试服务，使用 Ctrl+C 停止。人工菜单的构建版本询问和 Godot 选项询问保留。`--debug` 表示详细日志，与 `debug` 子命令不同。

旧命令 `--clean [类型]`、`--sync-deps` 继续可用，`mp-build` / `mp-debug` 分别为 `build` / `debug` 的别名。使用 `--help` 时仅显示帮助，不执行操作。

## 项目操作命令

进入生成好的项目根目录后，直接运行 CLI（支持 `node` 或已全局安装的命令）：

### 交互式主菜单

```bash
node src/index.mjs
```

在交互菜单中可以选择：

- 🆕 初始化新小程序项目（`init`）
- 🔍 小程序 - 打包小程序（`mp-build`）
- 📦 小程序 - 真机调试（`mp-debug`）
- 🧹 清理模式 - 清理临时文件（`clean`）
- 👋 退出

### 构建小程序（打包）

```bash
node src/index.mjs
```

在菜单中选择 **“小程序 - 打包小程序”**：

1. CLI 会读取项目根目录下 `app.json` 中的 `htyf` 配置。
2. 自动检测是否为 Godot 项目（是否存在 `project.godot`）：
   - 存在：按 **Godot 游戏** 流程打包。
   - 不存在：按 **普通小程序（React Native / Web）** 流程打包。
3. 提示输入版本号（默认在当前版本基础上自动 +1，例如 `1.0.0 -> 1.0.1`）。
4. 更新 `app.json` 中的版本号并执行构建，将资源输出到 `dist` 目录。

构建完成后，可以将产物上传到 `zipUrl` 指定的地址，供红糖云服 App 拉取与更新。

### 真机调试

在主菜单中选择 **“小程序 - 真机调试”**：

- CLI 会启动调试服务器，更新 `app.json` 中的调试地址。
- 在红糖云服 App 中配置好对应的调试入口，即可在真机上实时预览与调试。

> 具体调试行为（如 QR 码、连接方式）以红糖云服 App 当前版本为准。

### 清理命令

支持通过参数直接清理，无需进入交互界面：

```bash
node src/index.mjs --clean all     # 清理所有临时文件
node src/index.mjs --clean build   # 清理构建输出
node src/index.mjs --clean temp    # 清理临时目录
node src/index.mjs --clean logs    # 清理日志文件
node src/index.mjs --clean cache   # 清理缓存文件
```

也可以在交互菜单中选择 **“清理模式 - 清理临时文件”**，按提示选择清理范围。

## app.json 与 htyf 配置

项目根目录下会有一个 `app.json`，其中包含 `htyf` 字段，CLI 会从这里读取并更新应用配置：

- 重要字段包括：
  - `type`: `'app' | 'game' | 'web' | 'plugin'`
  - `appid`: 小程序唯一 ID
  - `name`: 应用名称
  - `zipUrl`: 构建产物 zip 包地址
  - `appUrlConfig`: 线上配置地址
  - `version`: 版本号（由 CLI 帮你自动递增或手动修改）

> 不同模板下的 `app.json` 字段说明和推荐配置，可在各自模板目录的 README 中查看：  
> - React Native 应用小程序：`_apps_temp_/README.md`  
> - Godot 游戏小程序：`_game_temp_/README.md`  
> - Web/H5 小程序：`_web_temp_/RADME.md`

