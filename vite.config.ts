import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('framer-motion') || id.includes('/motion/')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('/zod/')) return 'vendor-validation';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'vendor-react';
            return 'vendor-core';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        // Avoid full page reloads caused by server logs and JSON data writes.
        ignored: [
          '**/dev-server*.out',
          '**/dev-server*.err',
          '**/server/data/**',
          '**/artifacts/**',
          '**/dist/**',
        ],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
