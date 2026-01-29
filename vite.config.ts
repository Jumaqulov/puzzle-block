import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relative paths for Yandex Games
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs for prod
        drop_debugger: true
      },
      mangle: {
        toplevel: true, // Obfuscate top-level variables
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  },
  server: {
    host: true
  }
});
