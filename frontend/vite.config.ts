import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react')) return 'vendor'
          if (id.includes('node_modules/framer-motion')) return 'animations'
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/zustand') || id.includes('node_modules/@tanstack/react-query')) return 'state'
          if (id.includes('node_modules/react-hot-toast') || id.includes('node_modules/lucide-react') || id.includes('node_modules/clsx')) return 'ui'
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/dayjs')) return 'date'
        },
      },
    },
  },
  server: {
    port: 5176,
    proxy: {
      '/api': {
        target: 'https://app.socialpulses.io',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
