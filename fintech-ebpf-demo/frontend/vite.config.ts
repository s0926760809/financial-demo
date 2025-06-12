import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()  // 使用默认React配置，不添加任何复杂插件
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // 代理後端API請求
    proxy: {
      '/api/v1': {
        target: 'http://localhost:30080',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/api/trading': {
        target: 'http://localhost:30080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trading/, '/api/v1')
      },
      '/api/risk': {
        target: 'http://localhost:30081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/risk/, '')
      },
      '/api/payment': {
        target: 'http://localhost:30082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/payment/, '')
      },
      '/api/audit': {
        target: 'http://localhost:30083',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/audit/, '')
      },
      // WebSocket代理
      '/ws': {
        target: 'ws://localhost:30083',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // 最简化的构建配置
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // 简单的chunk分割
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      },
    },
  },
  define: {
    __DEV_MODE__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '3.0.0'),
  },
  // 最简化的依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom'
    ],
  },
}) 