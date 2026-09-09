export default {
  testEnvironment: 'node',
  transform: {},
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ['**/src/**/__tests__/?(*.)+(spec|test).js']
}
