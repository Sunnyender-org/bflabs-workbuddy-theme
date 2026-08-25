#!/usr/bin/env node
import { execFile, execFileSync, spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import WebSocket from '../vendor/ws/wrapper.mjs'
import {
  DEFAULT_PORT,
  RENDERER_FRAGMENT,
  applicationResources,
  injectionExpression,
  loadTheme,
  resolveApplicationPath,
  restoreExpression,
  scanFileForMarkers,
  statusExpression
} from './theme-library.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultThemeDirectory = path.dirname(scriptDirectory)

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function readMacValue(appPath, key) {
  try {
    return execFileSync('plutil', ['-extract', key, 'raw', path.join(appPath, 'Contents', 'Info.plist')], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function readApplicationVersion(appPath) {
  if (!appPath) return null
  if (process.platform === 'darwin') return readMacValue(appPath, 'CFBundleShortVersionString')
  if (process.platform === 'win32') {
    try {
      const escaped = appPath.replaceAll("'", "''")
      return execFileSync('powershell.exe', ['-NoProfile', '-Command', `(Get-Item -LiteralPath '${escaped}').VersionInfo.ProductVersion`], { encoding: 'utf8' }).trim()
    } catch {
      return null
    }
  }
  return null
}

async function targets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1200) })
  if (!response.ok) throw new Error(`WorkBuddy 调试端口返回 HTTP ${response.status}`)
  return response.json()
}

async function rendererTarget(port) {
  const list = await targets(port)
  return list.find((item) => item.type === 'page' && item.url?.toLowerCase().includes(RENDERER_FRAGMENT)) || null
}

async function cdpCall(port, method, params = {}) {
  const target = await rendererTarget(port)
  if (!target?.webSocketDebuggerUrl) throw new Error('调试端口在线，但没有找到 WorkBuddy 渲染页面')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('连接 WorkBuddy 渲染器超时')), 2500)
    socket.once('open', () => { clearTimeout(timer); resolve() })
    socket.once('error', () => { clearTimeout(timer); reject(new Error('无法连接 WorkBuddy 渲染器')) })
  })
  const id = 1
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WorkBuddy 渲染器响应超时')), 3500)
    socket.on('message', (data) => {
      const message = JSON.parse(String(data))
      if (message.id !== id) return
      clearTimeout(timer)
      if (message.error) reject(new Error(message.error.message || 'CDP 调用失败'))
      else if (message.result?.exceptionDetails) reject(new Error(message.result.exceptionDetails.text || '主题执行失败'))
      else resolve(message.result)
    })
    socket.send(JSON.stringify({ id, method, params }))
  })
  socket.terminate()
  return result
}

async function evaluate(port, expression) {
  const result = await cdpCall(port, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  return result?.result?.value
}

async function endpointIsLive(port) {
  try { return Boolean(await rendererTarget(port)) } catch { return false }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitForEndpoint(port) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    if (await endpointIsLive(port)) return
    await delay(400)
  }
  throw new Error('WorkBuddy 已启动，但调试端口未在 20 秒内就绪')
}

async function quitAndLaunch(appPath, port) {
  if (!appPath) throw new Error('找不到 WorkBuddy，请用 --app 指定安装位置')
  const args = [`--remote-debugging-address=127.0.0.1`, `--remote-debugging-port=${port}`]
  if (process.platform === 'darwin') {
    const bundleId = readMacValue(appPath, 'CFBundleIdentifier')
    if (bundleId) {
      await new Promise((resolve) => execFile('osascript', ['-e', `tell application id "${bundleId}" to quit`], () => resolve()))
      await delay(1200)
    }
    await new Promise((resolve, reject) => execFile('open', ['-na', appPath, '--args', ...args], (error) => error ? reject(error) : resolve()))
  } else if (process.platform === 'win32') {
    const executableName = path.basename(appPath)
    await new Promise((resolve) => execFile('taskkill.exe', ['/IM', executableName, '/T', '/F'], () => resolve()))
    await delay(1800)
    const child = spawn(appPath, args, { detached: true, stdio: 'ignore', windowsHide: false })
    child.unref()
  } else {
    throw new Error('当前运行时只支持 macOS 和 Windows')
  }
  await waitForEndpoint(port)
}

async function inspect() {
  const explicitPath = argument('--app')
  const appPath = resolveApplicationPath(explicitPath)
  const resources = applicationResources(appPath)
  const asarPath = resources ? path.join(resources, 'app.asar') : null
  const contract = await scanFileForMarkers(asarPath)
  const port = Number(argument('--port') || DEFAULT_PORT)
  print({
    status: appPath ? 'installed' : 'not-installed',
    appPath,
    version: readApplicationVersion(appPath),
    appAsar: asarPath && existsSync(asarPath) ? asarPath : null,
    rendererContract: { matched: contract.matched, missing: contract.missing },
    debugging: { port, endpoint: await endpointIsLive(port) }
  })
}

async function apply() {
  const port = Number(argument('--port') || DEFAULT_PORT)
  const themeDirectory = path.resolve(argument('--theme') || defaultThemeDirectory)
  const theme = loadTheme(themeDirectory)
  let live = await endpointIsLive(port)
  if (!live && !hasFlag('--restart-confirmed')) {
    throw new Error('需要重启 WorkBuddy 才能开启本地主题会话。确认任务已保存后，重新运行并加 --restart-confirmed。')
  }
  if (!live) {
    const appPath = resolveApplicationPath(argument('--app'))
    await quitAndLaunch(appPath, port)
    live = true
  }
  const result = await evaluate(port, injectionExpression(theme))
  print({ status: 'applied', port, ...result })
  if (!hasFlag('--watch')) return
  process.stdout.write('正在守护主题会话，按 Ctrl+C 停止守护。\n')
  while (true) {
    await delay(2500)
    try { await evaluate(port, injectionExpression(theme)) } catch { /* The next cycle retries after a renderer reload. */ }
  }
}

async function status() {
  const port = Number(argument('--port') || DEFAULT_PORT)
  if (!(await endpointIsLive(port))) return print({ status: 'offline', port, active: false })
  print({ status: 'online', port, ...(await evaluate(port, statusExpression())) })
}

async function restore() {
  const port = Number(argument('--port') || DEFAULT_PORT)
  if (!(await endpointIsLive(port))) return print({ status: 'offline', port, restored: false, active: false })
  print({ status: 'restored', port, ...(await evaluate(port, restoreExpression())) })
}

async function probe() {
  const port = Number(argument('--port') || DEFAULT_PORT)
  if (!(await endpointIsLive(port))) return print({ status: 'offline', port, active: false })
  const expression = `(() => {
    const roots = ['.conversation-sidebar', '.teams-main-content', '.detail-panel-container', '.cbChat'];
    const rootState = Object.fromEntries(roots.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [selector, { present: false }];
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return [selector, {
        present: true,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontFamily: style.fontFamily
      }];
    }));
    const visibleControls = [...document.querySelectorAll('button, [role="button"]')]
      .map((element) => element.getBoundingClientRect())
      .filter((bounds) => bounds.width > 0 && bounds.height > 0);
    return {
      active: Boolean(document.getElementById(${JSON.stringify('bflabs-workbuddy-theme-runtime')})),
      id: document.body?.getAttribute('data-workbuddy-theme') || null,
      version: document.body?.getAttribute('data-workbuddy-theme-version') || null,
      viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      visibleControls: visibleControls.length,
      undersizedVisibleControls: visibleControls.filter((bounds) => bounds.width < 40 || bounds.height < 40).length,
      tokens: {
        orange: getComputedStyle(document.body).getPropertyValue('--bf-color-orange').trim(),
        warmWhite: getComputedStyle(document.body).getPropertyValue('--bf-color-warm-white').trim(),
        controlRadius: getComputedStyle(document.body).getPropertyValue('--bf-radius-control').trim()
      },
      roots: rootState
    };
  })()`
  print({ status: 'probed', port, ...(await evaluate(port, expression)) })
}

async function screenshot() {
  const port = Number(argument('--port') || DEFAULT_PORT)
  if (!(await endpointIsLive(port))) throw new Error('WorkBuddy 调试端口未在线，无法截图')
  const output = path.resolve(argument('--output') || path.join(process.cwd(), 'workbuddy-theme.png'))
  const result = await cdpCall(port, 'Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
  if (!result?.data) throw new Error('WorkBuddy 没有返回截图数据')
  writeFileSync(output, Buffer.from(result.data, 'base64'))
  print({ status: 'captured', port, output, bytes: Buffer.byteLength(result.data, 'base64') })
}

export async function main(command = process.argv[2] || 'inspect') {
  if (command === 'inspect') return inspect()
  if (command === 'apply') return apply()
  if (command === 'status') return status()
  if (command === 'probe') return probe()
  if (command === 'screenshot') return screenshot()
  if (command === 'restore') return restore()
  throw new Error('用法：runtime.mjs inspect | apply | status | probe | screenshot | restore')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(() => {
    if (!hasFlag('--watch')) process.exit(process.exitCode || 0)
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  })
}
