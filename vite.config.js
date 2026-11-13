import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/aver-christmas-bingo/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        player: resolve(__dirname, 'player.html')
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
}));
