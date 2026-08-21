import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const keepSourceWorkbookPrivate = () => ({
  name: 'keep-source-workbook-private',
  apply: 'build' as const,
  async closeBundle() {
    await rm(resolve('dist/Data Catalog V1.xlsx'), { force: true })
  },
})

export default defineConfig({
  plugins: [react(), keepSourceWorkbookPrivate()],
  server: { port: 5173, open: true },
  build: { outDir: 'dist', sourcemap: true },
})
