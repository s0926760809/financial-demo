/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 金融主題色彩
        financial: {
          green: '#52c41a',
          red: '#ff4d4f',
          blue: '#1890ff',
          gold: '#faad14',
        },
        // 安全監控色彩
        security: {
          critical: '#a8071a',
          high: '#d46b08',
          medium: '#d48806',
          low: '#389e0d',
        },
        // eBPF 相關色彩
        ebpf: {
          primary: '#722ed1',
          secondary: '#531dab',
          accent: '#b37feb',
        }
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
        'financial': ['Roboto Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s infinite',
        'bounce-gentle': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      boxShadow: {
        'financial': '0 4px 12px rgba(24, 144, 255, 0.15)',
        'security': '0 4px 12px rgba(255, 77, 79, 0.15)',
        'success': '0 4px 12px rgba(82, 196, 26, 0.15)',
      },
    },
  },
  plugins: [],
  // 與 Ant Design 兼容
  corePlugins: {
    preflight: false,
  },
} 