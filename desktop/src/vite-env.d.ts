/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the Next.js app (no trailing slash), e.g. http://localhost:3000 */
  readonly VITE_BREAKPOINT_API_ORIGIN?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
