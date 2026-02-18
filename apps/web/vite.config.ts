import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@alumni/shared-schema': new URL('../../libs/shared-schema/src/index.ts', import.meta.url).pathname
    }
  }
})
