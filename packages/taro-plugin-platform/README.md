# `@htyf-mp/taro-plugin-platform`

Taro 插件。用于支持编译为红糖云服端小程序。

## 使用

#### 1. 配置插件

```js
// Taro 项目配置
module.exports = {
  // ...
  plugins: [
    '@htyf-mp/taro-plugin-platform'
  ]
}
```

#### 2. 编译为红糖云服端小程序

```shell
taro build --type htyf
taro build --type htyf --watch
```

#### 其它

##### 平台判断

```js
if (process.TARO_ENV === 'htyf') {
  // ...
}
```

##### API

支付宝 IOT 端小程序拓展了一些独有 API，可以通过 `Taro.iot.xxx` 来调用，例：

```js
Taro.htyf.test({})
  .then(res => console.log(res))
```

