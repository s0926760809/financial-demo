/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  // 更多環境變數...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 