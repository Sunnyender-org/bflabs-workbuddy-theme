import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadTheme } from './theme-library.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultThemeDirectory = path.dirname(scriptDirectory)

export function validateTheme(theme) {
  const errors = []
  const warnings = []
  const { manifest, css } = theme
  const scope = `body[data-workbuddy-theme="${manifest.id}"]`

  if (manifest.schemaVersion !== 1) errors.push('schemaVersion 必须为 1')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id || '')) errors.push('theme id 必须是小写 kebab-case')
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version || '')) errors.push('theme version 必须是语义化版本')
  if (!['light', 'dark'].includes(manifest.mode)) errors.push('mode 必须是 light 或 dark')
  if (!css.includes(scope)) errors.push(`CSS 必须限定在 ${scope}`)
  if (/transition\s*:\s*all\b/i.test(css)) errors.push('禁止 transition: all')
  if (/backdrop-filter\s*:/i.test(css)) errors.push('禁止用 backdrop-filter 作为主题材质')
  if (/background-clip\s*:\s*text/i.test(css)) errors.push('禁止渐变文字')
  if (/url\(\s*["']?https?:/i.test(css)) errors.push('主题 CSS 不得引用远程资源')
  if (/__[A-Z0-9_]+__/.test(css)) errors.push('主题仍包含未解析的嵌入资源占位符')
  if (/(^|[},])\s*\*\s*(?:[,{:]|$)/m.test(css)) errors.push('禁止全局通配选择器')
  if (/\b(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i.test(css)) errors.push('主题不得隐藏原生控件')
  if (/(?:^|[;{]\s*)(?:width|height|position|inset|top|right|bottom|left)\s*:/im.test(css)) warnings.push('发现几何属性，请确认仅用于不改变原生布局的装饰')
  if (!css.includes('prefers-reduced-motion')) errors.push('主题必须支持 prefers-reduced-motion')
  if (!css.includes('--vscode-editor-background')) errors.push('主题缺少 WorkBuddy 编辑器背景 token')
  if (!css.includes('--vscode-focusBorder')) errors.push('主题缺少焦点 token')
  if (!css.includes('.conversation-sidebar')) warnings.push('主题未覆盖侧栏稳定根节点')
  if (!css.includes('.teams-main-content')) warnings.push('主题未覆盖主工作区稳定根节点')
  return { errors, warnings }
}

export async function validatePreview(themeDirectory) {
  const preview = await readFile(path.join(themeDirectory, 'preview.html'), 'utf8')
  const errors = []
  if (!preview.includes(`data-workbuddy-theme="${loadTheme(themeDirectory).manifest.id}"`)) errors.push('预览页主题 id 不匹配')
  if (!preview.includes('lang="zh-CN"')) errors.push('预览页缺少中文语言标记')
  if (!preview.includes('aria-label=')) errors.push('预览页缺少可访问名称')
  return errors
}

export async function runValidation(themeDirectory = defaultThemeDirectory) {
  const theme = loadTheme(themeDirectory)
  const result = validateTheme(theme)
  result.errors.push(...await validatePreview(theme.directory))
  return { ...result, theme: { id: theme.manifest.id, version: theme.manifest.version, directory: theme.directory } }
}

async function main() {
  const themeDirectory = process.argv[2] ? path.resolve(process.argv[2]) : defaultThemeDirectory
  const result = await runValidation(themeDirectory)
  process.stdout.write(`${JSON.stringify({ status: result.errors.length ? 'invalid' : 'valid', ...result }, null, 2)}\n`)
  if (result.errors.length) process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
