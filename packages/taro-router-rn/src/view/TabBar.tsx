import {
  Link
} from '@react-navigation/native'
import * as React from 'react'
import {
  Animated,
  Dimensions,
  EmitterSubscription,
  Keyboard,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import { EdgeInsets, withSafeAreaInsets, WithSafeAreaInsetsProps } from 'react-native-safe-area-context'

import { getDefaultTabItem, getTabConfig, getTabItemConfig, getTabVisible, isUrl } from '../utils/index'
import TabBarItem, { TabBarOptions, TabOptions } from './TabBarItem'
import { getInitSafeAreaInsets } from './tabBarUtils'

interface TabBarProps extends TabBarOptions {
  state: Record<string, any>
  navigation: any
  descriptors: Record<string, any>
  tabOptions: TabOptions
}

interface TabBarState {
  visible: Animated.Value
  isKeyboardShown: boolean
  tabVisible: boolean
  layout: {
    height: number
    width: number
  }
  insets: EdgeInsets
}
interface TabBarStyle {
  color?: string
  selectedColor?: string
  backgroundColor?: string
  borderStyle?: string
}

const DEFAULT_TABBAR_HEIGHT = 55
const COMPACT_TABBAR_HEIGHT = 32
// const DEFAULT_MAX_TAB_ITEM_WIDTH = 125;

const useNativeDriver = Platform.OS !== 'web'

const styles = StyleSheet.create({
  tabBar: {
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8
  },
  tab: {
    flex: 1,
    alignItems: 'center'
  },
  tabPortrait: {
    justifyContent: 'flex-end',
    flexDirection: 'column'
  },
  tabLandscape: {
    justifyContent: 'center',
    flexDirection: 'row'
  }
})

export class TabBar extends React.PureComponent<TabBarProps & WithSafeAreaInsetsProps, TabBarState> {
  handleKeyboardShowEvent?: EmitterSubscription
  handleKeyboardHideEvent?: EmitterSubscription
  private visibilityAnimation?: Animated.CompositeAnimation
  constructor (props: TabBarProps & WithSafeAreaInsetsProps) {
    super(props)
    const { height = 0, width = 0 } = Dimensions.get('window')
    const { insets, safeAreaInsets, tabOptions = {} } = this.props
    const { tabBarVisible = true } = tabOptions
    const tabVisible = tabBarVisible === false ? false : getTabVisible()
    this.state = {
      visible: new Animated.Value(tabVisible ? 1 : 0),
      tabVisible: tabVisible,
      isKeyboardShown: false,
      layout: {
        width,
        height
      },
      // todo: remove safeAreaInsets
      // @ts-ignore
      insets: insets || safeAreaInsets || getInitSafeAreaInsets()
    }
  }

  componentDidMount () {
    this.updateKeyboardSubscriptions()
  }

  private removeKeyboardSubscriptions () {
    this.handleKeyboardShowEvent?.remove()
    this.handleKeyboardHideEvent?.remove()
    this.handleKeyboardShowEvent = undefined
    this.handleKeyboardHideEvent = undefined
  }

  private updateKeyboardSubscriptions () {
    this.removeKeyboardSubscriptions()
    if (!this.props.keyboardHidesTabBar) return
    this.handleKeyboardShowEvent = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => this.handleKeyboardShow()
    )
    this.handleKeyboardHideEvent = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => this.handleKeyboardHide()
    )
  }

  componentWillUnmount () {
    this.removeKeyboardSubscriptions()
    this.visibilityAnimation?.stop()
  }

  componentDidUpdate (prevProps: TabBarProps & WithSafeAreaInsetsProps): void {
    if (prevProps === this.props) return
    if (!!prevProps.keyboardHidesTabBar !== !!this.props.keyboardHidesTabBar) {
      this.updateKeyboardSubscriptions()
      if (!this.props.keyboardHidesTabBar && this.state.isKeyboardShown) {
        this.setState({ isKeyboardShown: false })
      }
    }
    const curVisible = this.props.tabOptions?.tabBarVisible !== false && getTabVisible() &&
      !(this.props.keyboardHidesTabBar && this.state.isKeyboardShown)
    if (curVisible !== this.state.tabVisible) {
      this.setState({ tabVisible: curVisible })
      this.setTabBarHidden(!curVisible)
    }
    if (this.props.insets && this.state.insets !== this.props.insets) {
      this.setState({ insets: this.props.insets })
    }
  }

  handleKeyboardShow () {
    this.setState({
      isKeyboardShown: true,
      tabVisible: false
    })
    this.setTabBarHidden(true)
  }

  handleKeyboardHide () {
    const tabVisible = this.props.tabOptions?.tabBarVisible !== false && getTabVisible()
    this.setState({ isKeyboardShown: false, tabVisible })
    this.setTabBarHidden(!tabVisible)
  }

  setTabBarHidden (isHidden: boolean) {
    this.visibilityAnimation?.stop()
    if (!getTabConfig('needAnimate')) return
    const { visible } = this.state
    if (isHidden) {
      this.setState({
        tabVisible: false
      })
      this.visibilityAnimation = Animated.timing(visible, {
        toValue: 0,
        duration: 200,
        useNativeDriver
      })
      this.visibilityAnimation.start()
    } else {
      this.visibilityAnimation = Animated.timing(visible, {
        toValue: 1,
        duration: 250,
        useNativeDriver
      })
      this.visibilityAnimation.start(({ finished }) => {
        if (finished) {
          this.setState({
            tabVisible: true
          })
        }
      })
    }
  }

  isLandscape (): boolean {
    const { height = 0, width = 0 } = Dimensions.get('window')
    return width > height
  }

  getDefaultTabBarHeight (): number {
    if (Platform.OS === 'ios' &&
      !Platform.isPad && this.isLandscape()) {
      return COMPACT_TABBAR_HEIGHT
    }
    return DEFAULT_TABBAR_HEIGHT
  }

  // 只有最简单的格式
  buildLink (name: string, params: Record<string, any>): string {
    const keys = Object.keys(params).sort()
    let str = ''
    keys.forEach((v) => {
      str += (v + '=' + encodeURIComponent(params[v]) + '&')
    })
    str = str.slice(0, str.length - 1)
    return str ? `${name}?${str}` : `${name}`
  }

  handleLayout = (e: LayoutChangeEvent): void => {
    const { layout } = this.state
    const { height, width } = e.nativeEvent.layout
    if (layout.height !== height || layout.width !== width) {
      this.setState({
        layout: {
          width,
          height
        }
      })
    }
  }

  getTabBarStyle (): Record<string, string> {
    const { activeTintColor, inactiveTintColor, style = {} } = this.props
    const tabStyle = getTabConfig('tabStyle') as TabBarStyle
    const { color = '', selectedColor = '', backgroundColor = '', borderStyle = '' } = tabStyle
    const defaultBackground: any = style?.backgroundColor || 'rgb(255, 255, 255)'
    const defalutBorderTopColor: any = style?.borderTopColor || 'rgb(216, 216, 216)'
    return {
      backgroundColor: backgroundColor || defaultBackground,
      borderTopColor: borderStyle || defalutBorderTopColor,
      color: color || inactiveTintColor,
      selectedColor: selectedColor || activeTintColor
    }
  }

  getTabIconSource (index: number, focused: boolean) {
    const item: any = getDefaultTabItem(index)
    const iconPath = getTabItemConfig(index, 'iconPath') ?? item?.iconPath
    const selectedIconPath = getTabItemConfig(index, 'selectedIconPath') ?? item?.selectedIconPath
    const path = focused ? selectedIconPath : iconPath

    return isUrl(path) ? { uri: path } : { uri: path }
  }

  renderContent () {
    const { state, descriptors, navigation } = this.props
    const horizontal = true
    const tabSelfStyle = this.getTabBarStyle()
    return <View style={{ flexDirection: 'row', flex: 1 }} onLayout={this.handleLayout}>
      {state.routes.map((route, index) => {
        const focused = index === state.index
        const { options } = descriptors[route.key]
        const tabLabel = getTabItemConfig(index, 'tabBarLabel')
        const label = tabLabel || (options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
            ? options.title
            : route.name)

        const accessibilityLabel =
          options.tabBarAccessibilityLabel !== undefined
            ? options.tabBarAccessibilityLabel
            : typeof label === 'string'
              ? `${label}, tab, ${index + 1} of ${state.routes.length}`
              : undefined

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key
          })

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key
          })
        }

        const badge = getTabItemConfig(index, 'tabBarBadge')
        const showRedDot = getTabItemConfig(index, 'showRedDot') || false

        const labelColor = focused ? tabSelfStyle.selectedColor : tabSelfStyle.color
        const source = this.getTabIconSource(index, focused)

        if (Platform.OS === 'web') {
          const linkTo = this.buildLink(route.name, route.params)
          return (
            <Link
              key={route.key}
              // @ts-ignore
              to={linkTo}
              style={[]}
              onPress={(e: any) => {
                if (
                  !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) &&
                  (e.button == null || e.button === 0)
                ) {
                  e.preventDefault()
                  onPress()
                }
              }}
            >
              <TabBarItem
                showRedDot={showRedDot}
                badge={badge}
                label={label}
                horizontal={horizontal}
                labelColor={labelColor}
                iconSource={source}
                size={25}
                {...this.props}
              />
            </Link>
          )
        } else {
          return (
            <TouchableWithoutFeedback
              key={options.tabBarTestID}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={accessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
            >
              <View
                style={[styles.tab, horizontal ? styles.tabLandscape : styles.tabPortrait]}
              >
                <TabBarItem
                  label={label}
                  badge={badge}
                  showRedDot={showRedDot}
                  horizontal
                  labelColor={labelColor}
                  iconSource={source}
                  size={25}
                  {...this.props}
                />
              </View>
            </TouchableWithoutFeedback>
          )
        }
      })}
    </View>
  }

  render () {
    const { insets, visible, layout, tabVisible, isKeyboardShown } = this.state
    const paddingBottom = Math.max(
      insets?.bottom - Platform.select({ ios: 4, default: 0 }), 5)

    const { style } = this.props

    const tabBarStyle = this.getTabBarStyle()
    const needAnimate = getTabConfig('needAnimate')

    const showTabBar = tabVisible !== false && !isKeyboardShown
    if (!needAnimate) {
      return (!showTabBar ? null
        : (
          <View
            style={[
              styles.tabBar,
              {
                height: this.getDefaultTabBarHeight() + paddingBottom,
                paddingBottom,
                paddingHorizontal: Math.max(insets.left, insets.right)
              },
              style,
              {
                backgroundColor: tabBarStyle.backgroundColor,
                borderTopColor: tabBarStyle.borderTopColor
              }
            ]}
          >
            {this.renderContent()}
          </View>)
      )
    } else {
      return (
        <Animated.View
          style={[
            styles.tabBar,
            showTabBar ? {
              height: this.getDefaultTabBarHeight() + paddingBottom,
              paddingBottom,
              paddingHorizontal: Math.max(insets.left, insets.right)
            } : {},
            {
              transform: [
                {
                  translateY: visible.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      layout.height + paddingBottom + StyleSheet.hairlineWidth,
                      0
                    ]
                  })
                }
              ],
              position: showTabBar ? 'relative' : (null as any)
            },
            style,
            {
              backgroundColor: tabBarStyle.backgroundColor,
              borderTopColor: tabBarStyle.borderTopColor
            }
          ]}
          pointerEvents={!tabVisible ? 'none' : 'auto'}
        >
          {this.renderContent()}
        </Animated.View>
      )
    }
  }
}

export default withSafeAreaInsets(TabBar)
