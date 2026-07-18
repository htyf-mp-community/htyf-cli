import type { TerminalReportableEvent } from 'metro/src/lib/TerminalReporter'
import * as path from 'node:path'
import * as readline from 'readline'

import { entryFilePath } from './defaults'
import { previewDev } from './preview'
import { shareObject } from './Support'

// Metro 不同版本导出方式不同：0.80 为 module.exports = class，较新版本为 { default: class }
const metroTerminalReporterModule = require('metro/src/lib/TerminalReporter')
const MetroTerminalReporter = metroTerminalReporterModule.default || metroTerminalReporterModule

type WatchChangeItem = { filePath: string; type: string }

function normalizeWatchChangeItems (event: any): WatchChangeItem[] {
  if (Array.isArray(event?.eventsQueue)) {
    return event.eventsQueue
  }

  const changes = event?.changes
  if (!changes) {
    return []
  }

  const rootDir = event.rootDir ?? ''
  const items: WatchChangeItem[] = []

  const appendFromMap = (
    map: Iterable<[string, unknown]> | undefined,
    type: string
  ) => {
    if (!map) return
    for (const [relativePath] of map) {
      items.push({
        filePath: path.isAbsolute(relativePath)
          ? relativePath
          : path.join(rootDir, relativePath),
        type,
      })
    }
  }

  const appendFromSet = (set: Iterable<string> | undefined, type: string) => {
    if (!set) return
    for (const relativePath of set) {
      items.push({
        filePath: path.isAbsolute(relativePath)
          ? relativePath
          : path.join(rootDir, relativePath),
        type,
      })
    }
  }

  appendFromMap(changes.addedFiles, 'add')
  appendFromMap(changes.modifiedFiles, 'change')
  appendFromMap(changes.removedFiles, 'delete')
  appendFromSet(changes.addedDirectories, 'add')
  appendFromSet(changes.removedDirectories, 'delete')

  return items
}

function getConfigurationRelatedChanges (items: WatchChangeItem[]): string[] {
  return items
    .filter(item => {
      if (item.filePath.includes(`${shareObject.entry}.config`)) {
        return true
      }
      return item.type !== 'change'
    })
    .map(item => item.filePath)
}

readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)
process.stdin.on('keypress', (_key, data) => {
  const { name } = data
  if (name === 'q') {
    previewDev({
      port: shareObject.port || 8081,
    })
  }
})

export default class TaroTerminalReporter extends MetroTerminalReporter {
  _initialized: boolean
  constructor (terminal: any) {
    super(terminal)
    this._initialized = false
  }

  async update (event: TerminalReportableEvent) {
    switch (event.type) {
      case 'initialize_started':
        console.log('To print qrcode press "q"')
        if (shareObject.qr) {
          previewDev(event)
        }
        break
      case 'bundle_build_done': {
        super.update(event)
        const realEntryPath = require.resolve(entryFilePath)
        if (this._initialized) {
          shareObject.cacheStore.ignoreEntryFileCache = false
          return
        }
        this._initialized = true
        if (!shareObject.metroServerInstance) {
          return
        }
        const incrementalBundler = shareObject.metroServerInstance.getBundler()
        const deltaBundler = incrementalBundler.getDeltaBundler()
        const bundler = incrementalBundler.getBundler()
        // @ts-ignore
        const findEntryGraphId = keys => {
          for (const k of keys) {
            return k
          }
          return null
        }
        const entryGraphId = findEntryGraphId(incrementalBundler._revisionsByGraphId.keys())
        const entryGraphVersion = await incrementalBundler.getRevisionByGraphId(entryGraphId)

        // @ts-ignore
        bundler.getDependencyGraph().then(dependencyGraph => {
          // @ts-ignore
          dependencyGraph.getWatcher().on('change', (event) => {
            const changedFiles = getConfigurationRelatedChanges(normalizeWatchChangeItems(event))
            if (!changedFiles.length) {
              return
            }
            const deltaCalculator = deltaBundler._deltaCalculators.get(entryGraphVersion.graph)
            // @ts-ignore
            const isConfigurationModified = keys => {
              for (const k of keys) {
                if (k.includes('.config') && k.includes(shareObject.sourceRoot)) {
                  return true
                }
              }
              return false
            }
            if (!deltaCalculator) {
              return
            }
            if (isConfigurationModified(changedFiles)) {
              shareObject.cacheStore.ignoreEntryFileCache = true
              deltaCalculator._modifiedFiles.add(realEntryPath)
              for (const value of deltaCalculator._modifiedFiles) {
                console.log(1, value)
              }
              // @ts-ignore
              this.terminal.flush()
              console.log('\nConfiguration(s) are changed.')
            }
          })
        })
      }
        break
      default:
        super.update(event)
        break
    }
  }
}
