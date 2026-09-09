import { act, fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import { View } from 'react-native'

import Carousel from '../components/Swiper/carousel'

const mockSetPage = jest.fn()
jest.mock('react-native-pager-view', () => {
  const React = jest.requireActual('react')
  const { View } = jest.requireActual('react-native')
  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ setPage: mockSetPage, setPageWithoutAnimation: jest.fn() }))
    return <View {...props} testID="pager" />
  })
})

const pages = [<View key="a" />, <View key="b" />]
beforeEach(() => { jest.useFakeTimers(); mockSetPage.mockClear() })
afterEach(() => jest.useRealTimers())

it('uses the updated autoplay interval immediately', () => {
  const { rerender, unmount } = render(<Carousel autoplay autoplayInterval={1000} dots={false}>{pages}</Carousel>)
  rerender(<Carousel autoplay autoplayInterval={100} dots={false}>{pages}</Carousel>)
  act(() => jest.advanceTimersByTime(100))
  expect(mockSetPage).toHaveBeenCalledWith(1)
  unmount()
  expect(jest.getTimerCount()).toBe(0)
})

it('resumes autoplay after dragging returns directly to idle', () => {
  const { getByTestId, unmount } = render(<Carousel autoplay autoplayInterval={100} dots={false}>{pages}</Carousel>)
  fireEvent(getByTestId('pager'), 'pageScrollStateChanged', { nativeEvent: { pageScrollState: 'dragging' } })
  act(() => jest.advanceTimersByTime(200))
  expect(mockSetPage).not.toHaveBeenCalled()
  fireEvent(getByTestId('pager'), 'pageScrollStateChanged', { nativeEvent: { pageScrollState: 'idle' } })
  act(() => jest.advanceTimersByTime(100))
  expect(mockSetPage).toHaveBeenCalledWith(1)
  unmount()
})

it('cancels pending autoplay when only one page remains', () => {
  const { rerender, unmount } = render(<Carousel autoplay autoplayInterval={100} dots={false}>{pages}</Carousel>)
  rerender(<Carousel autoplay autoplayInterval={100} dots={false}>{[pages[0]]}</Carousel>)
  act(() => jest.advanceTimersByTime(100))
  expect(mockSetPage).not.toHaveBeenCalled()
  unmount()
})

it('keeps controlled index changes and infinite-page offsets working', () => {
  const { rerender, unmount } = render(<Carousel selectedIndex={0} dots={false}>{pages}</Carousel>)
  rerender(<Carousel selectedIndex={1} dots={false}>{pages}</Carousel>)
  expect(mockSetPage).toHaveBeenLastCalledWith(1)
  rerender(<Carousel selectedIndex={1} infinite dots={false}>{pages}</Carousel>)
  expect(mockSetPage).toHaveBeenLastCalledWith(3)
  unmount()
})

it('cancels autoplay on disable and restarts it when enabled again', () => {
  const { rerender, unmount } = render(<Carousel autoplay autoplayInterval={100} dots={false}>{pages}</Carousel>)
  rerender(<Carousel autoplay={false} autoplayInterval={100} dots={false}>{pages}</Carousel>)
  act(() => jest.advanceTimersByTime(200))
  expect(mockSetPage).not.toHaveBeenCalled()
  rerender(<Carousel autoplay autoplayInterval={100} dots={false}>{pages}</Carousel>)
  act(() => jest.advanceTimersByTime(100))
  expect(mockSetPage).toHaveBeenCalledTimes(1)
  unmount()
  expect(jest.getTimerCount()).toBe(0)
})
