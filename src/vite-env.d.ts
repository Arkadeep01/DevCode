/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the DevCode API, e.g. http://localhost:4000/api */
  readonly VITE_API_BASE_URL?: string;
  /** Legacy alias for VITE_API_BASE_URL. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
