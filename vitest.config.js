import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Everything under test is Node-side: the Express app, the asset pipeline,
    // and a fetch helper that only needs globalThis.fetch.
    environment: 'node',
    // Tests must never reach real services. The server calls dotenv at import,
    // and dotenv fills in any variable that is *missing* from a local .env — so
    // these are set to empty strings rather than left unset. dotenv never
    // overwrites a variable that already exists, even an empty one.
    env: {
      MONGODB_URI: '',
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
    },
    include: ['src/**/*.test.{js,jsx}', 'server/**/*.test.js', 'scripts/**/*.test.mjs'],
  },
})
