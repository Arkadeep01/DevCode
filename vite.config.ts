import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  // `npm run preview` serves the production build; proxy the API there too so
  // the SPA keeps working without a VITE_API_BASE_URL.
  preview: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
