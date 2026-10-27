import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    emptyOutDir: false,
    // Nothing here needs source maps in production, and they would triple the
    // upload size on Hostinger's disk quota.
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code out of the app bundle so a content
        // edit does not force everyone to re-download React and the icon sets.
        manualChunks: isSsrBuild ? undefined : function (id) {
          const p = id.replaceAll('\\', '/')
          if (!p.includes('/node_modules/')) return
          if (p.includes('/react-router')) return 'router'
          if (p.includes('/react-icons') || p.includes('/lucide-react')) return 'icons'
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(p)) return 'react'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
}))
