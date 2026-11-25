import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@appdeploy/client': fileURLToPath(new URL('./src/appdeploy-client.ts', import.meta.url)),
    },
  },
  build: {
    outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
    sourcemap:
      process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
    target: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  },
});
