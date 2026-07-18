export const mockGetCurrentPosition = jest.fn(() => Promise.resolve({
  coords: {
    latitude: 0,
    longitude: 0,
    altitude: 0,
    accuracy: 0,
    speed: 0,
  },
  timestamp: Date.now(),
}))
export const mockWatchPosition = jest.fn(() => 'watch-token')
export const mockUnwatch = jest.fn()
export const mockRequestPermission = jest.fn(() => Promise.resolve('granted'))

const nitroGeolocation = {
  getCurrentPosition: mockGetCurrentPosition,
  watchPosition: mockWatchPosition,
  unwatch: mockUnwatch,
  requestPermission: mockRequestPermission,
}

export default nitroGeolocation
