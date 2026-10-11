import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const repositoryDir = path.resolve(rootDir, '../repository')

const GRAPH_INDEX_EXCLUDE = /^ProjectsNodeIndex\.json$/i
const GRAPH_INDEX_PREFIX = /^index/i

function isGraphRelationsFile(name: string): boolean {
  return (
    name.endsWith('.json') &&
    !GRAPH_INDEX_EXCLUDE.test(name) &&
    !GRAPH_INDEX_PREFIX.test(name)
  )
}

function repositoryPlugin(): Plugin {
  return {
    name: 'project-explorer-repository',
    configureServer(server) {
      server.middlewares.use('/api/repository/graph-files', (_req, res) => {
        const files = fs.existsSync(repositoryDir)
          ? fs
              .readdirSync(repositoryDir)
              .filter(isGraphRelationsFile)
              .sort((a, b) => a.localeCompare(b))
          : []
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(files))
      })

      server.middlewares.use('/repository', (req, res, next) => {
        const raw = decodeURIComponent((req.url ?? '/').split('?')[0])
        const relative = raw.replace(/^\/+/, '')
        const filePath = path.resolve(repositoryDir, relative)

        if (
          filePath !== repositoryDir &&
          !filePath.startsWith(`${repositoryDir}${path.sep}`)
        ) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          if (ext === '.json') {
            res.setHeader('Content-Type', 'application/json')
          }
          fs.createReadStream(filePath).pipe(res)
          return
        }

        next()
      })
    },
    closeBundle() {
      const outDir = path.resolve(rootDir, 'dist/repository')
      fs.mkdirSync(outDir, { recursive: true })
      if (!fs.existsSync(repositoryDir)) return

      for (const name of fs.readdirSync(repositoryDir)) {
        const src = path.join(repositoryDir, name)
        if (!fs.statSync(src).isFile() || !name.endsWith('.json')) continue
        fs.copyFileSync(src, path.join(outDir, name))
      }

      const projectDirs = fs
        .readdirSync(repositoryDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
      for (const dir of projectDirs) {
        const nested = path.join(repositoryDir, dir.name)
        for (const name of fs.readdirSync(nested)) {
          if (!name.endsWith('.json')) continue
          const nestedOut = path.join(outDir, dir.name)
          fs.mkdirSync(nestedOut, { recursive: true })
          fs.copyFileSync(path.join(nested, name), path.join(nestedOut, name))
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), repositoryPlugin()],
})
