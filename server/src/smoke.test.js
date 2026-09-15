import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import app from './index.js'

// Boot smoke test.
//
// `node --check` only parses a file. It happily passes an import of a
// name that doesn't exist, or a path that doesn't resolve — those fail at
// load time, not parse time. That gap shipped a broken server once: an
// edit put `getWorkoutForDay` in the `express` import instead of the
// controller's, --check was green, and the app died on boot with
// "Named export 'getWorkoutForDay' not found".
//
// These tests actually load the code, so anything that can't resolve
// fails here instead of in production.

const SRC = path.dirname(fileURLToPath(import.meta.url))

const sourceFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    if (!entry.name.endsWith('.js') || entry.name.endsWith('.test.js')) return []
    return [full]
  }))
  return files.flat()
}

test('every source module loads', async (t) => {
  const files = await sourceFiles(SRC)
  assert.ok(files.length > 10, `expected to find source files, found ${files.length}`)

  for (const file of files) {
    await t.test(path.relative(SRC, file), async () => {
      // an unresolvable import or a missing named export throws here
      await import(pathToFileURL(file).href)
    })
  }
})

test('the app serves requests without a database', async (t) => {
  // port 0 = let the OS pick, so this never collides with a dev server
  const server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  const { port } = server.address()

  await t.test('GET /api/health answers 200', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`)
    assert.equal(res.status, 200)
    assert.equal((await res.json()).status, 'ok')
  })

  await t.test('the route tree is mounted, not 404-ing wholesale', async () => {
    // protected, so 401 is the pass: it proves the router is wired up.
    // A 404 would mean the mount is missing.
    for (const route of [
      '/api/workouts',
      '/api/workouts/day',
      '/api/contests',
      '/api/exercises',
    ]) {
      const res = await fetch(`http://127.0.0.1:${port}${route}`)
      assert.equal(res.status, 401, `${route} should be mounted and protected`)
    }
  })

  await t.test('an unknown route still 404s', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/nope`)
    assert.equal(res.status, 404)
  })

  server.close()
})
