import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : l'appli fonctionne aussi bien servie à la racine que dans un sous-dossier.
  base: './',
  // En développement, les appels du mode en ligne vont au serveur local (npm run online:dev).
  server: {
    proxy: { '/api': { target: 'http://localhost:8787', ws: true } },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
