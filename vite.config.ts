import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFile, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const keepSourceWorkbookPrivate = () => ({
  name: 'keep-source-workbook-private',
  apply: 'build' as const,
  async closeBundle() {
    await rm(resolve('dist/Data Catalog V1.xlsx'), { force: true })
  },
})

const lineageHtmlAssets = (): Plugin => ({
  name: 'lineage-html-assets',
  configureServer(server) {
    server.middlewares.use('/diagramas_html', async (request, response, next) => {
      const fileName = decodeURIComponent(request.url ?? '').replace(/^\//, '')
      if (!/^[a-z0-9_]+_lineage[.]html$/i.test(fileName)) {
        next()
        return
      }
      try {
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(await readFile(resolve('diagramas_html', fileName), 'utf8'))
      } catch {
        next()
      }
    })
  },
  async closeBundle() {
    const sourceDirectory = resolve('diagramas_html')
    const outputDirectory = resolve('dist/diagramas_html')
    await mkdir(outputDirectory, { recursive: true })
    const sourceFiles = (await readdir(sourceDirectory)).filter((name) => name.endsWith('.html'))
    await Promise.all(sourceFiles.map((name) => copyFile(resolve(sourceDirectory, name), resolve(outputDirectory, name))))
  },
})

export default defineConfig({
  plugins: [react(), keepSourceWorkbookPrivate(), lineageHtmlAssets()],
  server: { port: 5173, open: true },
  build: { outDir: 'dist', sourcemap: true },
})
