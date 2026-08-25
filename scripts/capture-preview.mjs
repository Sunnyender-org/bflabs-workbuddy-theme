import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const themeDirectory = path.dirname(scriptDirectory)
const previewUrl = pathToFileURL(path.join(themeDirectory, 'preview.html')).href
const outputDirectory = path.join(themeDirectory, 'artifacts')

function chromeCandidates() {
  if (process.platform === 'darwin') return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
  if (process.platform === 'win32') return [
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')
  ].filter(Boolean)
  return ['/usr/bin/google-chrome', '/usr/bin/chromium']
}

function capture(chrome, name, width, height) {
  const output = path.join(outputDirectory, name)
  execFileSync(chrome, [
    '--headless=new',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--disable-gpu',
    `--window-size=${width},${height}`,
    `--screenshot=${output}`,
    previewUrl
  ], { stdio: 'pipe' })
  return output
}

const chrome = chromeCandidates().find((candidate) => existsSync(candidate))
if (!chrome) throw new Error('找不到 Chrome 或 Chromium，无法渲染主题预览')
mkdirSync(outputDirectory, { recursive: true })
const files = [
  capture(chrome, 'bflabs-studio-1440.png', 1440, 900),
  capture(chrome, 'bflabs-studio-375.png', 375, 812),
  capture(chrome, 'bflabs-studio-390.png', 390, 844)
]
process.stdout.write(`${JSON.stringify({ status: 'captured', files }, null, 2)}\n`)
