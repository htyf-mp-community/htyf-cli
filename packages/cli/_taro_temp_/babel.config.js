// babel-preset-taro 更多选项和默认值：
// https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md
module.exports = function (api) {
  api.cache(() => process.env.TARO_ENV)

  // Metro 打包 RN/htyf 时使用 React Native 官方 preset，才能处理 Flow 语法
  if (process.env.TARO_ENV === 'rn' || process.env.TARO_ENV === 'htyf') {
    return {
      presets: ['module:@react-native/babel-preset'],
      plugins: [
        [
          'module-resolver',
          {
            root: ['./'],
            alias: {
            },
          },
        ],
      ],
    }
  }

  return {
    presets: [
      ['taro', {
        framework: 'react',
        ts: true,
        compiler: 'webpack5',
      }]
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
          },
        },
      ],
    ],
  }
}
