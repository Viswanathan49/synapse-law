import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-pdf': ['pdfjs-dist'],
          'vendor-exports': ['jspdf', 'html2canvas', 'pptxgenjs'],
          'vendor-ai': ['@google/generative-ai'],
          'vendor-parser': ['mammoth', 'diff-match-patch'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/utils/**', 'src/services/**'],
      thresholds: {
        lines: 80,
        functions: 80,
      },
    },
  },
})
