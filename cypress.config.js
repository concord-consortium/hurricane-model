const { defineConfig } = require('cypress')

module.exports = defineConfig({
  video: false,
  defaultCommandTimeout: 8000,
  viewportWidth: 1280,
  viewportHeight: 1000,
  retries: 1,
  e2e: {
    baseUrl: 'http://localhost:8080',
  },
})
