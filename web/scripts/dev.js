import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const apiPort = process.env.PORT ?? '3000'
const api = spawn(process.execPath, ['server/server.js'], { cwd: root, env: process.env, stdio: ['inherit', 'pipe', 'inherit'] })
let vite
let stopping = false
let apiOutput = ''

api.stdout.setEncoding('utf8')
api.stdout.on('data', (chunk) => {
  apiOutput += chunk
  process.stdout.write(`[api] ${chunk}`)
  if (!vite && apiOutput.includes(`http://127.0.0.1:${apiPort}`)) startVite()
})
api.on('error', fail)
api.on('exit', (code, signal) => {
  if (stopping) return
  if (!vite) fail(new Error(`API stopped before becoming ready (${signal ?? code})`))
  else stop(code ?? 1)
})

function startVite() {
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: root, env: process.env, stdio: 'inherit' })
  vite.on('error', fail)
  vite.on('exit', (code) => { if (!stopping) stop(code ?? 1) })
}

function fail(error) {
  console.error(`[dev] ${error.message}`)
  stop(1)
}

function stop(code = 0) {
  if (stopping) return
  stopping = true
  if (vite && vite.exitCode === null) vite.kill('SIGTERM')
  if (api.exitCode === null) api.kill('SIGTERM')
  process.exitCode = code
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(0))
