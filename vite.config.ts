import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Cấu hình Vite kèm PWA để cài app trực tiếp trên điện thoại
export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Quản Lý Toa Thuốc',
        short_name: 'Toa Thuốc',
        description: 'Ứng dụng cá nhân lưu trữ và tra cứu toa thuốc bằng AI',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
