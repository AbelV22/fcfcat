/**
 * cf-postbuild.mjs
 * Post-build script for Cloudflare Pages deployment.
 * Copies all .open-next/* (except assets/) into .open-next/assets/,
 * renames worker.js -> _worker.js, and copies _routes.json.
 */
import { readdirSync, cpSync, renameSync, copyFileSync, existsSync, lstatSync, rmSync, readlinkSync, mkdirSync } from 'fs'
import { join, resolve, dirname } from 'path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const openNext = join(root, '.open-next')
const assets = join(openNext, 'assets')

/** Remove ALL symlinks from a directory tree (they won't work on Cloudflare) */
function removeSymlinks(dir) {
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      try {
        const stat = lstatSync(full)
        if (stat.isSymbolicLink()) {
          rmSync(full)
          console.log(`cf-postbuild: removed symlink ${full}`)
        } else if (stat.isDirectory()) {
          removeSymlinks(full)
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

// Remove symlinks from server-functions before copying (external packages not needed in worker)
removeSymlinks(join(openNext, 'server-functions'))

// Copy everything except 'assets' into assets/
for (const entry of readdirSync(openNext)) {
  if (entry === 'assets') continue
  cpSync(join(openNext, entry), join(assets, entry), { recursive: true, errorOnExist: false, force: true })
}

// Remove any remaining symlinks from the final output
removeSymlinks(assets)

// Rename worker.js -> _worker.js
const workerSrc = join(assets, 'worker.js')
const workerDst = join(assets, '_worker.js')
if (existsSync(workerSrc)) renameSync(workerSrc, workerDst)

// Copy _routes.json
const routesSrc = join(root, '_routes.json')
const routesDst = join(assets, '_routes.json')
if (existsSync(routesSrc)) copyFileSync(routesSrc, routesDst)

console.log('cf-postbuild: done ✓')
