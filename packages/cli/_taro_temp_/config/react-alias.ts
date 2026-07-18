import path from 'path'
import type Chain from 'webpack-chain'

const react18Root = path.dirname(require.resolve('react/package.json'))
const reactDom18Root = path.dirname(require.resolve('react-dom/package.json'))

/** 小程序 / H5 等 Webpack 构建固定使用 React 18 */
export function applyReact18Alias(chain: Chain) {
  chain.resolve.alias
    .set('react', react18Root)
    .set('react-dom', reactDom18Root)
}
