import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

export const DEFAULT_PORT = 9339
export const STYLE_ID = 'bflabs-workbuddy-theme-runtime'
export const THEME_ATTRIBUTE = 'data-workbuddy-theme'
export const VERSION_ATTRIBUTE = 'data-workbuddy-theme-version'
export const RENDERER_FRAGMENT = '/resources/app.asar/renderer/index.html'
export const REQUIRED_RENDERER_MARKERS = [
  '--vscode-editor-background',
  '--cb-vscode-editor-background',
  'conversation-sidebar',
  'teams-main-content',
  'detail-panel-container',
  'cbChat'
]

export function applicationCandidates(platform = process.platform, environment = process.env) {
  const userHome = environment.HOME || homedir()
  if (platform === 'darwin') {
    return [
      '/Applications/WorkBuddy AI.app',
      '/Applications/WorkBuddy.app',
      path.join(userHome, 'Applications', 'WorkBuddy AI.app'),
      path.join(userHome, 'Applications', 'WorkBuddy.app')
    ]
  }
  if (platform === 'win32') {
    const local = environment.LOCALAPPDATA
    const programFiles = environment.ProgramFiles
    const programFilesX86 = environment['ProgramFiles(x86)']
    return [
      local && path.join(local, 'Programs', 'WorkBuddy AI', 'WorkBuddy AI.exe'),
      local && path.join(local, 'Programs', 'WorkBuddy', 'WorkBuddy.exe'),
      local && path.join(local, 'WorkBuddy AI', 'WorkBuddy AI.exe'),
      local && path.join(local, 'WorkBuddy', 'WorkBuddy.exe'),
      programFiles && path.join(programFiles, 'WorkBuddy AI', 'WorkBuddy AI.exe'),
      programFiles && path.join(programFiles, 'WorkBuddy', 'WorkBuddy.exe'),
      programFilesX86 && path.join(programFilesX86, 'WorkBuddy AI', 'WorkBuddy AI.exe'),
      programFilesX86 && path.join(programFilesX86, 'WorkBuddy', 'WorkBuddy.exe'),
      'D:\\workbuddy\\WorkBuddy.exe'
    ].filter(Boolean)
  }
  return []
}

export function resolveApplicationPath(explicitPath, options = {}) {
  const exists = options.exists || existsSync
  if (explicitPath) {
    const resolved = path.resolve(explicitPath)
    return exists(resolved) ? resolved : null
  }
  return applicationCandidates(options.platform, options.environment).find((candidate) => exists(candidate)) || null
}

export function applicationResources(appPath, platform = process.platform) {
  if (!appPath) return null
  if (platform === 'darwin') return path.join(appPath, 'Contents', 'Resources')
  if (platform === 'win32') return path.join(path.dirname(appPath), 'resources')
  return null
}

export function loadTheme(themeDirectory) {
  const directory = path.resolve(themeDirectory)
  const manifestPath = path.join(directory, 'theme.json')
  if (!existsSync(manifestPath)) throw new Error(`主题缺少 theme.json：${directory}`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const cssPath = path.resolve(directory, manifest.css || 'theme.css')
  if (!cssPath.startsWith(`${directory}${path.sep}`) || !existsSync(cssPath)) throw new Error('主题 CSS 路径无效')
  let css = readFileSync(cssPath, 'utf8')
  for (const [placeholder, asset] of Object.entries(manifest.embeddedAssets || {})) {
    const assetPath = path.resolve(directory, asset.path)
    if (!assetPath.startsWith(`${directory}${path.sep}`) || !existsSync(assetPath)) throw new Error(`主题嵌入资源路径无效：${asset.path}`)
    const dataUrl = `data:${asset.mime};base64,${readFileSync(assetPath).toString('base64')}`
    if (!css.includes(placeholder)) throw new Error(`主题 CSS 缺少嵌入资源占位符：${placeholder}`)
    css = css.replaceAll(placeholder, dataUrl)
  }
  return { directory, manifest, css }
}

export function injectionExpression(theme) {
  const id = JSON.stringify(theme.manifest.id)
  const version = JSON.stringify(theme.manifest.version)
  const css = JSON.stringify(theme.css)
  const styleId = JSON.stringify(STYLE_ID)
  return `(() => {
    const root = document.body;
    if (!root) return { applied: false, reason: 'body-missing' };
    let style = document.getElementById(${styleId});
    if (!style) {
      style = document.createElement('style');
      style.id = ${styleId};
      document.head.appendChild(style);
    }
    style.textContent = ${css};
    root.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)}, ${id});
    root.setAttribute(${JSON.stringify(VERSION_ATTRIBUTE)}, ${version});
    return { applied: true, id: ${id}, version: ${version}, styleBytes: style.textContent.length };
  })()`
}

export function statusExpression() {
  return `(() => {
    const style = document.getElementById(${JSON.stringify(STYLE_ID)});
    return {
      active: Boolean(style),
      id: document.body?.getAttribute(${JSON.stringify(THEME_ATTRIBUTE)}) || null,
      version: document.body?.getAttribute(${JSON.stringify(VERSION_ATTRIBUTE)}) || null,
      styleBytes: style?.textContent?.length || 0
    };
  })()`
}

export function restoreExpression() {
  return `(() => {
    document.getElementById(${JSON.stringify(STYLE_ID)})?.remove();
    document.body?.removeAttribute(${JSON.stringify(THEME_ATTRIBUTE)});
    document.body?.removeAttribute(${JSON.stringify(VERSION_ATTRIBUTE)});
    return { restored: true, active: false };
  })()`
}

export async function scanFileForMarkers(filePath, markers = REQUIRED_RENDERER_MARKERS) {
  if (!filePath || !existsSync(filePath)) return { matched: [], missing: [...markers] }
  const remaining = new Set(markers)
  const matched = new Set()
  let carry = ''
  const longest = Math.max(...markers.map((marker) => marker.length), 1)
  for await (const chunk of createReadStream(filePath, { highWaterMark: 1024 * 1024 })) {
    const text = carry + chunk.toString('latin1')
    for (const marker of remaining) {
      if (text.includes(marker)) {
        remaining.delete(marker)
        matched.add(marker)
      }
    }
    if (remaining.size === 0) break
    carry = text.slice(-(longest - 1))
  }
  return { matched: [...matched], missing: [...remaining] }
}
