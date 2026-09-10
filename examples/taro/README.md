# HTYF Taro Playground

从 Taro Playground v1.11.0 迁移的独立示例，保留源项目的功能页面和分类菜单。页面、资源和适配器保存在 `src/playground/`。

本示例从 `taro-ui/examples/demo-htyf` 移入，使用本仓库 `_taro_temp_` 的工程骨架和已验证的 HTYF 构建配置；不依赖 taro-ui 仓库或其 node_modules。它加入仓库根 pnpm workspace，`@htyf-mp/*` 通过 `workspace:*` 引用 `packages/` 中对应包，统一使用根 `pnpm-lock.yaml`。示例保持 `private: true`，不参与包发布。

## 运行

```sh
# 在仓库根目录安装依赖并构建本地包
pnpm install
pnpm --filter './packages/**' run build
cd examples/taro
pnpm check:playground
pnpm typecheck
pnpm dev:htyf
```

`dev:htyf` 会显示 HTYF CLI 菜单，可选择本地开发或真机调试。需要仅执行本地编译时：

```sh
pnpm bundle:ios
pnpm bundle:android
```

输出在 `dist/ios` 和 `dist/android`。正式打包前按自己的应用信息设置 `htyf.config.json`；当前保留模板的示例 App ID 和资源域名。

## 功能与限制

启动进入源“项目”页，底部菜单与源 RN 版本一致：项目、全局、组件、接口、探索、关于，保留原图标、顺序及各页分类入口。保留旧迁移的适配及限制：旧 RNDevManager Bundle 不能在 HTYF 直接运行，BMap 依赖浏览器，设备能力与样式仍需真机验收。详见 [迁移记录](docs/playground-migration.md) 和 [兼容差异](docs/htyf-migration-gaps.md)。
