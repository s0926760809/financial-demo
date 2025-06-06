import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
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
    // 優化打包
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd', '@ant-design/icons'],
          charts: ['recharts', 'chart.js', 'react-chartjs-2'],
          utils: ['lodash', 'dayjs', 'axios'],
        },
      },
    },
    // 故意保留一些調試信息用於演示
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 故意不移除console.log
        drop_debugger: false, // 故意不移除debugger
      },
      mangle: {
        keep_fnames: true, // 保留函數名用於調試
      },
    },
  },
  define: {
    // 故意暴露一些環境信息用於安全演示
    __DEV_MODE__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '3.0.0'),
  },
  // 開發時的優化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      '@ant-design/icons',
      'socket.io-client',
      'axios',
      'lodash',
      'dayjs',
    ],
  },
}) 