# Playground 迁移差异与验收事项

## 旧版 Bundle 加载（阻塞）

源 `pages/home/index.tsx` 和探索案例依赖原生 `RNDevManager.load` / `loadBundleByBundleUrl`。目标 HTYF 的微应用加载机制与源 React Native 0.73 / Taro 4.0 Bundle 格式不同，现有 Taro API 没有等价的旧 Bundle 执行接口。未修改 iOS/Android，也没有尝试执行外部 Bundle。

- 输入、扫码、历史记录与清空历史已迁移。加载旧 Bundle 时显示不可用说明。
- 探索案例打开对应 Web 版本，GitHub 和小程序二维码入口保留。
- 如需恢复旧 Bundle 执行，需单独设计宿主兼容或将外部应用重新打包为 HTYF 微应用；不能仅增加一个 JS 调用。
- 验收：在宿主确认加载协议、版本和隔离机制后，分别验证本地服务、远程 JS 和 release scheme。

## TabBar（已对齐源菜单，待真机验收）

2026-09-09 已恢复源六个底部 Tab 的名称、图标及顺序，并直接进入“项目”页。使用应用 tabBar 配置及 Taro switchTab / TabBar API，移除模块内流式标签。切换保留状态、返回键和菜单 API 的实际显示仍需 HTYF 真机验收。

## 原源代码中的限制

- ECharts 百度地图示例依赖浏览器 BMap，源 effectScatterBmap 已写明暂不支持；HTYF 不提供 BMap DOM 环境。杭州轨迹页保留原代码供后续移植，HTYF 页面提供明确说明和原始示例链接。
- 源路由配置中注释关闭的 audio、canvas、map 组件页保留源码，不自动开放原先不存在的入口。
- ECharts 的 HTML tooltip formatter、saveAsImage 等原有渲染器限制继续适用。

## 真机验收待完成

当前仅完成本地 HTYF Bundle 编译与静态/适配器校验，没有连接目标宿主执行真机验收。相机、扫码、定位、传感器、电话、媒体保存和权限拒绝路径需在宿主中验证；Lottie/Skia/渐变/Reanimated 依赖按 HTYF CLI 0.7.0 的共享版本安装，仍需验证实际宿主拥有这些版本。

标准页面使用现有 Taro 导航栏，不新建自定义覆盖层。需在横竖屏、长标题和不同安全区下确认宿主导航与胶囊不重叠。图表宽度跟随窗口尺寸更新。

编译有源示例样式与源示例样式警告，包括不支持的选择器、部分 Web 属性及 Sass API 弃用提示；不将 Bundle 成功视为像素一致的真机验收。具体样式需结合实际渲染继续核对。
