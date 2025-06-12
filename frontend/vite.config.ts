import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true, // 在預設瀏覽器中自動開啟報告
      gzipSize: true, // 顯示 gzip 後的大小
      brotliSize: true, // 顯示 brotli 後的大小
      filename: 'dist/stats.html', // 產出報告的位置
    }),
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
    // 優化打包
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // 使用更精確的路徑匹配來分割大型依賴
          if (id.includes('/node_modules/monaco-editor/')) {
            return 'monaco-editor';
          }
          if (id.includes('/node_modules/recharts/') || id.includes('/node_modules/chart.js/')) {
            return 'charts';
          }
          if (id.includes('/node_modules/antd/')) {
            return 'antd';
          }
          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
          // 將其他的 node_modules 單獨打包
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
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
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
}) 