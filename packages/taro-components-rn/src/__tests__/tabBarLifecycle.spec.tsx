import { act, fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import { Animated, Dimensions, Keyboard, Platform, View } from 'react-native'

import { TabBar } from '../../../taro-router-rn/src/view/TabBar'
import * as tabUtils from '../../../taro-router-rn/src/utils/index'

jest.mock('@react-navigation/native', () => ({ Link: 'Link' }))
jest.mock('../../../taro-router-rn/src/utils/index', () => ({
  getTabVisible: () => true,
  getTabConfig: jest.fn((key: string) => key === 'tabStyle' ? {} : false)
}))

const props = {
  state: { routes: [], index: 0 }, navigation: {}, descriptors: {}, tabOptions: {},
  insets: { top: 0, bottom: 0, left: 0, right: 0 }, activeTintColor: 'red',
  inactiveTintColor: 'gray', activeBackgroundColor: 'white', inactiveBackgroundColor: 'white'
}

const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

beforeEach(() => {
  (tabUtils.getTabConfig as jest.Mock).mockImplementation(key => key === 'tabStyle' ? {} : false)
})
afterEach(() => jest.restoreAllMocks())

it('attaches keyboard subscriptions when enabled after mounting and removes them on disable', () => {
  const callbacks = new Map<string, (...args: any[]) => void>()
  const remove = jest.fn()
  const addListener = jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
    callbacks.set(event, callback)
    return { remove }
  })
  const { rerender, unmount } = render(<TabBar {...props} keyboardHidesTabBar={false} />)
  rerender(<TabBar {...props} keyboardHidesTabBar />)
  expect(addListener).toHaveBeenCalledTimes(2)
  expect(callbacks.has(showEvent)).toBe(true)
  expect(callbacks.has(hideEvent)).toBe(true)
  rerender(<TabBar {...props} keyboardHidesTabBar={false} />)
  expect(remove).toHaveBeenCalledTimes(2)
  unmount()
  expect(remove).toHaveBeenCalledTimes(2)
})

it('shows the tab bar again when keyboard hiding is disabled while the keyboard is open', () => {
  const callbacks = new Map<string, (...args: any[]) => void>()
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
    callbacks.set(event, callback)
    return { remove: jest.fn() }
  })
  const { rerender, toJSON, unmount } = render(<TabBar {...props} keyboardHidesTabBar />)
  act(() => callbacks.get(showEvent)!())
  expect(toJSON()).toBeNull()
  rerender(<TabBar {...props} keyboardHidesTabBar={false} />)
  expect(toJSON()).not.toBeNull()
  unmount()
})

it('updates the layout when only one dimension changes', () => {
  const ref = React.createRef<TabBar>()
  const { UNSAFE_getAllByType, unmount } = render(<TabBar {...props} ref={ref} />)
  const { height, width } = Dimensions.get('window')
  const content = UNSAFE_getAllByType(View).find(node => node.props.onLayout)!
  fireEvent(content, 'layout', { nativeEvent: { layout: { width: width + 10, height } } })
  expect(ref.current!.state.layout).toEqual({ width: width + 10, height })
  unmount()
})

it('keeps the tab bar hidden across prop updates while the keyboard is open', () => {
  const callbacks = new Map<string, (...args: any[]) => void>()
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
    callbacks.set(event, callback)
    return { remove: jest.fn() }
  })
  const { rerender, toJSON, unmount } = render(<TabBar {...props} keyboardHidesTabBar />)
  act(() => callbacks.get(showEvent)!())
  rerender(<TabBar {...props} keyboardHidesTabBar activeTintColor="blue" />)
  expect(toJSON()).toBeNull()
  act(() => callbacks.get(hideEvent)!())
  expect(toJSON()).not.toBeNull()
  rerender(<TabBar {...props} keyboardHidesTabBar tabOptions={{ tabBarVisible: false }} />)
  expect(toJSON()).toBeNull()
  unmount()
})


it('stops an interrupted visibility animation and cleans up on unmount', () => {
  ;(tabUtils.getTabConfig as jest.Mock).mockImplementation(key => key === 'tabStyle' ? {} : true)
  const animations: Array<{ start: jest.Mock, stop: jest.Mock, reset: jest.Mock }> = []
  jest.spyOn(Animated, 'timing').mockImplementation(() => {
    const animation = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() }
    animations.push(animation)
    return animation
  })
  const callbacks = new Map<string, (...args: any[]) => void>()
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
    callbacks.set(event, callback)
    return { remove: jest.fn() }
  })
  const { unmount } = render(<TabBar {...props} keyboardHidesTabBar />)
  act(() => callbacks.get(showEvent)!())
  act(() => callbacks.get(hideEvent)!())
  expect(animations).toHaveLength(2)
  expect(animations[0].stop).toHaveBeenCalledTimes(1)
  unmount()
  expect(animations[1].stop).toHaveBeenCalledTimes(1)
})
