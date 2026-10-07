// Boots the demo API against a throwaway database, runs the HTTP smoke
// suite, and shuts everything down. Usage: npm test
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const port = 3100
const base = `http://127.0.0.1:${port}`

const dir = await mkdtemp(join(tmpdir(), 'mythics-test-'))
const server = spawn(process.execPath, [join(here, '../server/server.js')], {
  env: { ...process.env, PORT: String(port), DATABASE_PATH: join(dir, 'demo.sqlite') },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stderr.on('data', (chunk) => process.stderr.write(chunk))

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const res = await fetch(`${base}/health`)
      if (res.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('API did not become healthy')
}

let code = 0
try {
  await waitForHealth()
  const smoke = spawn(process.execPath, [join(here, 'smoke.mjs')], { env: { ...process.env, BASE_URL: base }, stdio: 'inherit' })
  code = await new Promise((resolve) => smoke.on('close', resolve))
} finally {
  server.kill()
  await rm(dir, { recursive: true, force: true })
}
process.exit(code)
