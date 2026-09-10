import { playgroundPages } from './playground/routes'

/** 保留源 Playground RN 的六个底部菜单及图标顺序。 */
const tabs = [
  {
    iconPath: './playground/assets/iconpark/cycle.png',
    selectedIconPath: './playground/assets/iconpark/cycle_selected.png',
    pagePath: 'playground/pages/global/index',
    text: '全局'
  },
  {
    iconPath: './playground/assets/iconpark/components.png',
    selectedIconPath: './playground/assets/iconpark/components_selected.png',
    pagePath: 'playground/pages/components/index',
    text: '组件'
  },
  {
    iconPath: './playground/assets/iconpark/ring.png',
    selectedIconPath: './playground/assets/iconpark/ring_selected.png',
    pagePath: 'playground/pages/apis/index',
    text: '接口'
  },
  {
    iconPath: './playground/assets/iconpark/painted-eggshell.png',
    selectedIconPath: './playground/assets/iconpark/painted-eggshell_selected.png',
    pagePath: 'playground/pages/explore/index',
    text: '探索'
  },
  {
    iconPath: './playground/assets/iconpark/user.png',
    selectedIconPath: './playground/assets/iconpark/user_selected.png',
    pagePath: 'playground/pages/about/index',
    text: '关于'
  }
];

/** 独立 HTYF 示例直接进入源项目首页，由 Taro 管理底部菜单和页面栈。 */
export default {
  pages: playgroundPages,
  window: { navigationBarTitleText: 'Taro Playground', navigationBarBackgroundColor: '#ffffff', navigationBarTextStyle: 'black', backgroundTextStyle: 'light' },
  tabBar: { color: '#333333', selectedColor: '#6190E8', list: tabs },
  htyf: { useNativeStack: true }
}
