import { act, render } from '@testing-library/react-native'
import * as React from 'react'
import { Animated } from 'react-native'

import Badge from '../../../taro-router-rn/src/view/Badge'
import Loading from '../../../taro-router-rn/src/view/Loading'
import HeadTitle from '../../../taro-router-rn/src/view/HeadTitle'
import TabBarItem from '../../../taro-router-rn/src/view/TabBarItem'

jest.mock('../../../taro-router-rn/src/rootNavigation', () => ({
  navigationRef: { current: { getCurrentRoute: () => ({ params: {} }) } }
}))

afterEach(() => jest.restoreAllMocks())

it('stops the native loading loop on unmount and does not restart on rerender', () => {
  const animation = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() }
  const loop = jest.spyOn(Animated, 'loop').mockReturnValue(animation)
  const timing = jest.spyOn(Animated, 'timing')
  const { rerender, unmount } = render(<Loading />)
  expect(animation.start).toHaveBeenCalledTimes(1)
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    duration: 2000, useNativeDriver: true, isInteraction: false
  }))
  rerender(<Loading />)
  expect(loop).toHaveBeenCalledTimes(1)
  unmount()
  expect(animation.stop).toHaveBeenCalledTimes(1)
})

it('cancels stale badge animations during rapid visibility changes and unmount', () => {
  const animations: Array<{ start: jest.Mock, stop: jest.Mock, reset: jest.Mock }> = []
  const spring = jest.spyOn(Animated, 'spring').mockImplementation(() => {
    const animation = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() }
    animations.push(animation)
    return animation
  })
  const { queryByText, rerender, unmount } = render(<Badge visible={false}>8</Badge>)
  expect(queryByText('8')).toBeNull()
  rerender(<Badge visible>8</Badge>)
  expect(queryByText('8')).not.toBeNull()
  expect(animations[0].stop).toHaveBeenCalledTimes(1)
  rerender(<Badge visible={false}>8</Badge>)
  expect(queryByText('8')).toBeNull()
  expect(animations[1].stop).toHaveBeenCalledTimes(1)
  expect(spring.mock.calls.map(([, config]) => config.toValue)).toEqual([0, 1, 0])
  act(() => unmount())
  expect(animations[2].stop).toHaveBeenCalledTimes(1)
})

it('renders title defaults and header overrides', () => {
  const { getByText, rerender } = render(<HeadTitle label="Page" color="red" />)
  expect(getByText('Page')).toHaveStyle({ color: 'red' })
  rerender(<HeadTitle label="Page" color="red" headerProps={{ children: 'Custom', tintColor: 'blue' }} />)
  expect(getByText('Custom')).toHaveStyle({ color: 'blue' })
})

it('preserves tab labels and badge truncation', () => {
  const props = {
    label: 'Home', labelColor: 'red', horizontal: false, showRedDot: false,
    badge: 1234, iconSource: 1, activeTintColor: 'red', inactiveTintColor: 'gray',
    activeBackgroundColor: 'white', inactiveBackgroundColor: 'white'
  }
  const { getByText, queryByText, rerender } = render(<TabBarItem {...props} />)
  expect(getByText('Home')).toHaveStyle({ color: 'red' })
  expect(getByText('...')).toBeTruthy()
  rerender(<TabBarItem {...props} badge={0} showLabel={false} />)
  expect(queryByText('Home')).toBeNull()
  expect(queryByText('...')).toBeNull()
})
