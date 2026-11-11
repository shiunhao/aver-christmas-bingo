import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/aver-christmas-bingo/' : '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  }
}));
