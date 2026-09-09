# Taro 转换与 Stylelint 优化记录

日期：2026-09-09。

## GitHub 方案比较

- [Stylelint 官方插件指南](https://github.com/stylelint/stylelint/blob/main/docs/developer-guide/plugins.md)及[16 迁移指南](https://github.com/stylelint/stylelint/blob/main/docs/migration-guide/to-16.md)：采用公开的 `report` 参数，移除对内部 `lib/utils` 的引用；配置加载 ESM 插件，同时为直接 `require()` 保留真正的 `.cjs` 入口。
- [stylelint-react-native](https://github.com/kristerkari/stylelint-react-native)：提供相近的 RN 属性与字体规则，可参考规则结构。现有库还有 Taro 的单位、平台与 ICSS 约定，因此本次保留规则命名和默认启用策略。
- [react-native-css-transformer](https://github.com/kristerkari/react-native-css-transformer)：适合 CSS 到 RN 对象的轻量转换。根据本地代码对照，直接替换还需要补齐 Sass/Less/Stylus、平台文件优先级和动态缩放表达式，因此本次不替换转换链。
- [Lightning CSS](https://github.com/parcel-bundler/lightningcss)：提供 Rust 实现的 CSS 解析、转换和压缩。它的性能方向值得后续实验，但不能据此认为其输出能直接替代本项目的 RN 对象转换；本次未引入新原生二进制依赖。
- [Taro 上游入口转换器](https://github.com/NervJS/taro/tree/main/packages/taro-rn-transformer)：本项目仍保留入口、页面配置和全局样式注入流程，优化其中的 AST 扫描与路径处理。

## 已落实的改动

### stylelint-config-taro-rn / stylelint-taro-rn

- 配置相对自身解析插件的 ESM 入口，避免依赖调用方工作目录，并保留 CJS 使用方式。
- 修正 `type: module` 下的 CommonJS 后缀及默认导出形态。
- Rollup 只构建一次模块图，再输出三种产物；保留原有模块目录产物。纯 JavaScript 源码不再经过 TypeScript 插件，配置改为 ESM JavaScript，构建进程可以正常结束。
- 属性白名单使用 `Set` 查询；行高规则完整匹配数值及单位，拒绝 `16pxjunk`、`1..2vh` 等无效值。
- 使用公开的 `report({ word })` 定位声明值，移除 Stylelint 私有工具引用。
- 测试改用仓库已有 Jest，补充 Less/SCSS 解析器开发依赖。

### taro-rn-style-transformer

- 用按配置对象区分的 WeakMap 替换跨项目共享的单例，避免第一个项目的配置污染后续项目。
- 每次独立合并像素配置，避免修改模块级默认对象。
- `postcss-pxtransform` 使用其支持的 `rn` 模式，避免错误生成 `rpx`；条件编译注释仍兼容 `htyf` 与 `rn`。
- 引用已经在依赖中声明的本地 `@htyf-mp/taro-css-to-react-native`，避免意外使用旧同名 npm 包。
- 增加可选的 `htyf.postcss.stylelint.enable: false`；默认继续检查样式。适合已经在独立 CI 步骤运行 Stylelint 的项目。
- 修复旧测试配置、平台夹具与对 Less 包内部测试资源的依赖。

配置对象在一个转换会话内应保持不变；配置变化时传入新对象。这里不缓存转换结果，因此不会因为 CSS 文件变化而返回旧结果。

### taro-rn-transformer

- 收集样式 import 时只检查顶层语句，避免遍历所有 JSX 和函数体。
- JS 中没有 `<` 时跳过 JSX 解析；找到 JSX 元素或 Fragment 后停止遍历。
- 扩展名判断使用真正的点号，避免把 `notjsx` 误判成 JSX 文件。
- 全局样式注入支持绝对文件名，确保子目录导入带 `./`，不会被误判为 npm 包。
- 更新已有 app 输出的旧快照，并对快照输入规范化行尾空白；未修改 app 生成逻辑。

## 验证

在各包目录执行：

- Stylelint 插件：`NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --runInBand --watchman=false`，67 项通过。
- Stylelint 配置：同上，20 项通过。
- 样式转换器：`pnpm exec vitest run`，28 项通过。
- 入口转换器：`pnpm exec jest --runInBand --watchman=false`，7 项通过。
- 两个 TypeScript 转换库的类型检查通过；Stylelint 的 CJS 和 ESM 入口均成功加载 4 条规则。

局部性能测量：生成一个含 400 个 JSX 函数的文件，预热 3 次后扫描样式 import 30 次，输出一致；本机单次测量从 454ms 降至 57ms。此数据只衡量 import 扫描，不代表完整构建速度。Rollup 从三次模块图构建改为一次，移除冗余 TypeScript 插件后，本次 Rollup 构建日志约 58ms，耗时也受机器和缓存影响。

尚未做真实应用的 Metro 全量构建及真机验证。Sass 仍保留现有 importer 接口，测试会提示旧 API / `@import` 弃用；直接切换现代 Sass API 需要单独验证平台解析优先级。
