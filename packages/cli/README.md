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
2. **输入应用显示名称**（2–4 个中文/字母/数字）。
3. **选择模板类型**：
   - `app-template`：React Native 应用小程序（对应 `type: 'app'`）。
   - `game-template`：Godot 游戏小程序（对应 `type: 'game'`）。
   - `web-template`：Web/H5 小程序（对应 `type: 'web'`）。
4. 选择模板仓库镜像（当前默认使用 GitHub）。

CLI 会自动：

- 克隆官方模版仓库到临时目录。
- 清理无关模版，仅保留所选模板。
- 生成 `app.json` 中的 `htyf` 配置（包含 `appid`、`name`、`zipUrl`、`appUrlConfig` 等）。
- 将模板拷贝到你指定的项目目录中。

> 各模板的具体用法，请参考生成项目中 `_apps_temp_` / `_game_temp_` / `_web_temp_` 目录下的 `README.md`。

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

