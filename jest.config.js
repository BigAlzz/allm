module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/frontend/src/__mocks__/fileMock.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@mui/material/styles$': '<rootDir>/frontend/src/__mocks__/mui.js'
  },
  setupFilesAfterEnv: ['<rootDir>/frontend/src/setupTests.js'],
  testMatch: [
    '<rootDir>/frontend/src/tests/**/*.test.js',
    '<rootDir>/frontend/src/tests/e2e/**/*.e2e.js'
  ],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }],
        ['@babel/preset-react', {
          runtime: 'automatic'
        }]
      ],
      plugins: ['@babel/plugin-transform-runtime']
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel/runtime|@mui/material|@emotion/react|@emotion/styled)/)'
  ],
  moduleDirectories: ['node_modules', 'frontend/src'],
  collectCoverageFrom: [
    'frontend/src/**/*.{js,jsx}',
    '!frontend/src/tests/**',
    '!frontend/src/index.js',
    '!frontend/src/reportWebVitals.js'
  ]
};