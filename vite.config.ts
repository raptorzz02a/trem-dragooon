import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : l'appli fonctionne aussi bien servie à la racine que dans un sous-dossier.
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
