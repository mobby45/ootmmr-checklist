import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        global: 'globalThis',
    },
    plugins: [
        svelte({
          onwarn: (warning, handler) => {
            if (warning.code === 'a11y-click-events-have-key-events') return;
            if (warning.code === 'a11y-no-static-element-interactions') return;
            handler(warning);
          }
        }),
    ],
    resolve: {
        alias: {
            '@ootmm/core': path.resolve('./OoTMM/packages/core/src'),
            '@ootmm/logic': path.resolve('./OoTMM/packages/logic/src'),
        },
    },
    optimizeDeps: {
        include: ['lodash-es'],
        exclude: ['@ootmm/core', '@ootmm/logic'],
    },
    server: {
        fs: {
            allow: ['.', './OoTMM'],
        },
    },
    base: '/ootmmr-checklist/',
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
            },
        },
    },
});