# npm 发布资源与项目结构检查

检查日期：2026-09-09。范围为 `packages/*` 中的全部 13 个可发布包。

## 结构结论

项目采用 pnpm workspace 管理依赖、Lerna 管理版本与发布，根包设置 `private: true`，结构合理。移除了 workspace 中不存在的 `example/` 配置。

```text
packages/
  cli/                         CLI 与项目创建
  taro-plugin-platform/        平台插件
  taro-rn-runner/              构建入口
  taro-rn-supporter/           构建适配
  taro-rn-transformer/         JSX/脚本转换
  taro-rn-style-transformer/   样式转换
  css-to-react-native/        CSS 值转换
  stylelint-config-taro-rn/   样式检查配置
  stylelint-taro-rn/          样式检查规则
  taro-components-rn/         RN 组件
  taro-router-rn/             路由
  taro-runtime-rn/            运行时
  taro-rn/                    Taro API 实现
scripts/                     构建辅助与发布资源检查
```

CLI 下嵌套的模板目录不是 workspace 包，也不打入 CLI 的 npm 包；模板按现有机制获取。保留已有源码路径、运行时资源和公开入口，避免影响下游深层路径引用。

## 已修复问题

- 构建命令显式执行 clean，避免依赖未执行的 prebuild 钩子而残留旧产物。
- 移除 runner、taro-rn 中重复的依赖包构建，统一由 workspace 按依赖顺序构建；API 生成放到 TypeScript 编译前。
- 修正 transformer 无效的 types 入口，为 components、runner、supporter、transformer 生成声明文件。
- runtime 编译后复制源码已有的 `.d.ts`，修复生成声明引用不存在文件的问题。
- 不发布测试、setup 等开发文件；Stylelint 仅发布 CJS、ESM 两个入口及其 sourcemap。
- 不携带源码的 TypeScript 产物将源码内嵌进 sourcemap，避免调试引用失效。
- 平台插件通过 `createRequire().resolve()` 解析 CLI 资源，兼容依赖提升后的安装布局。
- 发布脚本先构建并检查实际 tarball，检查失败时中止后续发布。

## 本次打包结果

| 包目录 | 文件数 | 压缩后 KiB |
| --- | ---: | ---: |
| cli | 24 | 37.7 |
| css-to-react-native | 47 | 15.7 |
| stylelint-config-taro-rn | 3 | 1.8 |
| stylelint-taro-rn | 6 | 7.9 |
| taro-components-rn | 308 | 328.9 |
| taro-plugin-platform | 19 | 26.6 |
| taro-rn | 367 | 101.9 |
| taro-rn-runner | 14 | 12.9 |
| taro-rn-style-transformer | 69 | 66.9 |
| taro-rn-supporter | 49 | 38.0 |
| taro-rn-transformer | 18 | 17.6 |
| taro-router-rn | 62 | 63.8 |
| taro-runtime-rn | 47 | 27.6 |

Stylelint 文件数从 46 降至 6；部分包因补齐类型声明和 sourcemap 源码而增大，本次不以总包体积下降作为验收标准。

## 重复验证

```sh
pnpm test:packages
pnpm pack:packages
# 已构建时，可单独检查并指定 tarball 输出目录：
pnpm verify:packages --output-dir /tmp/htyf-package-check
```

`pack:packages` 构建并实际执行 pnpm pack，不上传 npm。检查覆盖入口、文件白名单、相对静态引用、声明引用、sourcemap 源码、开发文件、内部依赖版本和未替换的本地依赖协议。结果包含 tarball 和 report.json；默认输出到临时目录并打印路径。检查脚本需要 Node.js、pnpm 和 tar。

本次全部构建通过、13 个真实 tarball 检查通过、3 个发布检查回归测试通过。验证使用当前已安装依赖，未执行独立项目全新安装或 RN 真机回归；静态检查不覆盖动态路径、外部依赖行为或所有消费者的深层引用。本次未发布 npm。
