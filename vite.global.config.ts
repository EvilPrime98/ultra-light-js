import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/ultra-light.ts'),
      name: 'UltraLight',
      formats: ['iife'],
      fileName: () => 'ultra-light.global.js',
    },
  },
});
