import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [svelte({
      onwarn: (warning, handler) => {
        if (warning.code === 'a11y-click-events-have-key-events') return;
        if (warning.code === 'a11y-no-static-element-interactions') return;
        handler(warning);
      }
    })],
    base: 'https://cemulate.github.io/ootmmr-checklist/',
});