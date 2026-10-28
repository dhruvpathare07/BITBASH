import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Writes dist/sw.js listing every file of this build, so players can keep
// playing (and even reload) after the event network is cut.
// A new version string per build makes browsers pick up each new deploy.
function precacheServiceWorker() {
  return {
    name: 'bbb-precache-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = new Set(['/', '/index.html', '/vite.svg'])
      for (const fileName of Object.keys(bundle)) {
        if (!fileName.endsWith('.map')) files.add('/' + fileName)
      }
      const template = fs.readFileSync(path.resolve(__dirname, 'sw-template.js'), 'utf8')
      const source = template
        .replaceAll('__VERSION__', Date.now().toString(36))
        .replaceAll('__FILES__', JSON.stringify([...files].sort(), null, 2))
      if (source.includes('__VERSION__') || source.includes('__FILES__')) {
        this.error('sw.js still contains a placeholder')
      }
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheServiceWorker()],
})
