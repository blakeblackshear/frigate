module.exports = {
  moduleFileExtensions: ['js', 'jsx'],
  name: 'react-component-benchmark',
  resetMocks: true,
  roots: ['<rootDir>'],
  setupFilesAfterEnv: ['<rootDir>/config/setupTests.js'],
  testEnvironment: 'jsdom',
  timers: 'fake',
};
