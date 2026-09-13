import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const fontSourceDirectory = join(
  projectRoot,
  'node_modules',
  '@fontsource',
  'roboto',
  'files',
)
const fontTargetDirectory = join(projectRoot, 'public', 'fonts')

await mkdir(fontTargetDirectory, { recursive: true })
await Promise.all([
  copyFile(
    join(fontSourceDirectory, 'roboto-latin-ext-400-normal.woff'),
    join(fontTargetDirectory, 'report-roboto-400.woff'),
  ),
  copyFile(
    join(fontSourceDirectory, 'roboto-latin-ext-700-normal.woff'),
    join(fontTargetDirectory, 'report-roboto-700.woff'),
  ),
])
