import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  STYLE_ID,
  applicationCandidates,
  applicationResources,
  injectionExpression,
  loadTheme,
  resolveApplicationPath,
  restoreExpression,
  statusExpression
} from '../scripts/theme-library.mjs'
import { runValidation, validateTheme } from '../scripts/validate-theme.mjs'

const themeDirectory = fileURLToPath(new URL('../', import.meta.url))

test('BF Labs theme passes its static contract', async () => {
  const result = await runValidation(themeDirectory)
  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.warnings, [])
  assert.equal(result.theme.id, 'bflabs-studio')
  assert.equal(result.theme.version, '0.2.3')
  assert.deepEqual(loadTheme(themeDirectory).manifest.verifiedWorkBuddy.map(({ platform }) => platform).sort(), ['macos', 'windows'])
})

test('theme CSS is scoped, local, reversible, and motion-aware', () => {
  const theme = loadTheme(themeDirectory)
  assert.deepEqual(validateTheme(theme).errors, [])
  assert.match(theme.css, /body\[data-workbuddy-theme="bflabs-studio"\]/)
  assert.doesNotMatch(theme.css, /url\(\s*["']?https?:/i)
  assert.doesNotMatch(theme.css, /transition\s*:\s*all/i)
  assert.match(theme.css, /prefers-reduced-motion/)
  assert.match(theme.css, /prefers-reduced-transparency/)
  assert.match(theme.css, /prefers-contrast: more/)
  assert.match(theme.css, /--bf-color-charcoal: #111417/)
  assert.match(theme.css, /--bf-color-warm-white: #faf8f5/)
  assert.match(theme.css, /--bf-color-orange: #ff6a33/)
  assert.match(theme.css, /--bf-radius-control: 2px/)
  assert.match(theme.css, /--bf-radius-surface: 4px/)
  assert.match(theme.css, /data:font\/woff2;base64,/)
  assert.doesNotMatch(theme.css, /__BF_[A-Z0-9_]+__/)
  assert.equal(theme.manifest.sources.bflabsUi, 'f49157ff586adf91f6ba21f00f1dbbbb36e0afc5')
  assert.equal(theme.manifest.sources.appleDesign, 'd23d7f88a2e21c9e4b1418c7abe420f5c1052ba7')

  const injection = injectionExpression(theme)
  assert.match(injection, new RegExp(STYLE_ID))
  assert.match(statusExpression(), new RegExp(STYLE_ID))
  assert.match(restoreExpression(), /removeAttribute/)
})

test('Windows runtime closes only the WorkBuddy process tree and supports custom installs', async () => {
  const runtime = await readFile(new URL('../scripts/runtime.mjs', import.meta.url), 'utf8')
  assert.match(runtime, /taskkill\.exe', \['\/IM', executableName, '\/T', '\/F'\]/)
  assert.match(runtime, /if \(!hasFlag\('--watch'\)\) process\.exit/)
  const candidates = applicationCandidates('win32', { HOME: 'C:\\Users\\ender', LOCALAPPDATA: 'C:\\Users\\ender\\AppData\\Local', ProgramFiles: 'C:\\Program Files' })
  assert.equal(candidates.some((candidate) => candidate.endsWith(path.join('WorkBuddy AI', 'WorkBuddy AI.exe'))), true)
  assert.equal(candidates.includes('D:\\workbuddy\\WorkBuddy.exe'), true)
  const customPath = path.resolve('custom-workbuddy')
  assert.equal(resolveApplicationPath(customPath, { exists: (candidate) => candidate === customPath }), customPath)
})

test('runtime resolves current and legacy macOS bundles', () => {
  const candidates = applicationCandidates('darwin', { HOME: '/Users/ender' })
  assert.deepEqual(candidates.slice(0, 2), ['/Applications/WorkBuddy AI.app', '/Applications/WorkBuddy.app'])
  assert.equal(applicationResources('/Applications/WorkBuddy AI.app', 'darwin'), path.join('/Applications/WorkBuddy AI.app', 'Contents', 'Resources'))
})

test('preview and exact BF mark are publishable without private runtime data', async () => {
  const preview = await readFile(new URL('../preview.html', import.meta.url), 'utf8')
  const themeMark = await readFile(new URL('../assets/bf-mark.svg', import.meta.url), 'utf8')
  assert.match(preview, /Build Forward with AI Agents/)
  assert.match(preview, /模型与额度/)
  assert.doesNotMatch(preview, /1173137921|WB-CLOSE-10003|token_id|beefapi_log_id/i)
  assert.match(themeMark, /viewBox="0 0 1200 700"/)
  assert.equal(createHash('sha256').update(themeMark).digest('hex'), 'b0d9ddb495944da69737d3e34d016594b1474c9513585a566bc101cccbb8fa34')
})

test('bundled fonts and WebSocket client retain their licenses', async () => {
  const spaceLicense = await readFile(new URL('../assets/fonts/OFL-Space-Grotesk.txt', import.meta.url), 'utf8')
  const interLicense = await readFile(new URL('../assets/fonts/OFL-Inter.txt', import.meta.url), 'utf8')
  const wsLicense = await readFile(new URL('../vendor/ws/LICENSE', import.meta.url), 'utf8')
  const runtime = await readFile(new URL('../scripts/runtime.mjs', import.meta.url), 'utf8')
  assert.match(spaceLicense, /SIL OPEN FONT LICENSE Version 1\.1/)
  assert.match(interLicense, /SIL OPEN FONT LICENSE Version 1\.1/)
  assert.match(wsLicense, /Copyright \(c\) 2016 Luigi Pinca/)
  assert.match(runtime, /socket\.terminate\(\)/)
  assert.doesNotMatch(runtime, /socket\.close\(\)/)
  assert.equal(Object.keys(loadTheme(themeDirectory).manifest.embeddedAssets).length, 5)
})
