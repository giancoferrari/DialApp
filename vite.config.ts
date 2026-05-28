import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/golf-search': {
          target: 'https://api.golfcourseapi.com',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Key ${env.GOLF_COURSE_API_KEY}`)
              proxyReq.path = proxyReq.path
                .replace('/api/golf-search', '/v1/search')
                .replace(/[?&]q=/, '?search_query=')
            })
          },
        },
      },
    },
  }
})
