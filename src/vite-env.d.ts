/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_LOCAL?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
