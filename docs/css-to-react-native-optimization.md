# css-to-react-native 优化

日期：2026-09-09。包：`@htyf-mp/taro-css-to-react-native`。

对照 [styled-components/css-to-react-native 上游实现](https://github.com/styled-components/css-to-react-native/blob/master/src/index.js) 后，保留本地转换内核。上游原始数字转换直接返回数字，本地还需输出 `scalePx2dp`、`scaleVu2dp` 表达式，并支持 rem 与 scalable 选项，因此不直接替换上游包。

## 修改

- 逐条声明直接调用属性转换函数，省去临时二维数组、reduce 和一次结果合并；只在线高判断时执行相关单位正则。
- 两次规则排序合并为一次，保留普通规则顺序及 export 的覆盖顺序。
- Babel 按已有 engines 要求使用 Node 18 目标，继续生成 CommonJS，减少旧环境语法辅助代码。
- 修复尾部 `!important` 被错误截断为 `ant` 的问题，保留历史 `!import` 别名；仍按原有声明顺序覆盖，不新增 CSS 优先级计算。
- 修复布尔值匹配误吞 `trueblue`、`notfalse` 等字符串的问题。
- 跳过 export 中的注释，避免产生 undefined 导出键；只将转换表自有属性识别为简写转换器。
- 修正公开声明中的声明元组与简写黑名单类型；将原先遗漏的排序测试纳入执行，修正 JS 覆盖率文件范围。

## 验证与收益

- 转换库 186 个测试通过，下游样式转换器 28 个测试通过。
- Babel 构建成功，全部 13 个包的真实 tarball 检查通过，未发布 npm。
- 当前包压缩大小约 18.5 → 15.7 KiB，减少约 15%。
- 本地 Node 24 基准：300 条规则，每条包含 width、height、margin、border-radius、color、opacity、transform；预热 30 次，交替运行新旧实现各 9 轮，每轮 30 次。
- 优化前后该样本的完整输出深比较一致；单次转换中位耗时 6.49 → 6.02 ms，约减少 7.3%。这是本地合成样本结果，不代表项目整体打包加速比例。

重跑测试：分别在本包和 `packages/taro-rn-style-transformer` 执行 `pnpm test`。根目录执行 `pnpm verify:packages` 检查已构建包。
