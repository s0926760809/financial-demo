import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加載環境變量
  const env = loadEnv(mode, process.cwd(), '')
  
  // 判斷是否為容器環境
  const isContainer = process.env.DOCKER || process.env.KUBERNETES_SERVICE_HOST;
  
  return {
    plugins: [
      react(),
      visualizer({
        open: !isContainer, // 在容器中不自動開啟報告
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0', // 綁定到所有網路介面，支援容器訪問
      port: 3000,
      strictPort: true,
      // 容器環境下啟用輪詢以支援文件監聽
      watch: {
        usePolling: isContainer,
        interval: 1000,
      },
      // HMR 配置
      hmr: {
        // 在容器中使用端口而不是文件系統
        port: isContainer ? 3001 : undefined,
        host: isContainer ? '0.0.0.0' : 'localhost',
      },
      // 代理後端API請求
      proxy: {
        '/api/v1': {
          target: env.VITE_API_BASE_URL || 'http://localhost:30080',
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
          target: env.VITE_TRADING_API_URL || 'http://localhost:30080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/trading/, '/api/v1')
        },
        '/api/risk': {
          target: env.VITE_RISK_API_URL || 'http://localhost:30081',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/risk/, '')
        },
        '/api/payment': {
          target: env.VITE_PAYMENT_API_URL || 'http://localhost:30082',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/payment/, '')
        },
        '/api/audit': {
          target: env.VITE_AUDIT_API_URL || 'http://localhost:30083',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/audit/, '')
        },
        // WebSocket代理
        '/ws': {
          target: env.VITE_WS_URL || 'ws://localhost:30083',
          ws: true,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: process.env.NODE_ENV !== 'production',
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
          drop_console: process.env.NODE_ENV === 'production' ? true : false,
          drop_debugger: process.env.NODE_ENV === 'production' ? true : false,
        },
        mangle: {
          keep_fnames: true, // 保留函數名用於調試
        },
      },
    },
    define: {
      // 故意暴露一些環境信息用於安全演示
      __DEV_MODE__: JSON.stringify(mode === 'development'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '3.0.0'),
      __CONTAINER_MODE__: JSON.stringify(!!isContainer),
      // 注入環境變量到客戶端
      __VITE_API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || '/api'),
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
      // 在容器中強制重新構建優化
      force: isContainer,
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
    // 預覽服務器配置（容器部署時使用）
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
    // 環境變量配置
    envDir: '.',
    envPrefix: ['VITE_', 'REACT_'],
  }
}) 