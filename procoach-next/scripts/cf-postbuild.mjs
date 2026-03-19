/**
 * cf-postbuild.mjs
 * Post-build script for Cloudflare Pages deployment.
 * Copies all .open-next/* (except assets/) into .open-next/assets/,
 * renames worker.js -> _worker.js, and copies _routes.json.
 */
import { readdirSync, cpSync, renameSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const openNext = join(root, '.open-next')
const assets = join(openNext, 'assets')

// Copy everything except 'assets' into assets/
for (const entry of readdirSync(openNext)) {
  if (entry === 'assets') continue
  cpSync(join(openNext, entry), join(assets, entry), { recursive: true })
}

// Rename worker.js -> _worker.js
const workerSrc = join(assets, 'worker.js')
const workerDst = join(assets, '_worker.js')
if (existsSync(workerSrc)) renameSync(workerSrc, workerDst)

// Copy _routes.json
const routesSrc = join(root, '_routes.json')
const routesDst = join(assets, '_routes.json')
if (existsSync(routesSrc)) copyFileSync(routesSrc, routesDst)

console.log('cf-postbuild: done ✓')
