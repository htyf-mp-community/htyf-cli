import * as path from 'node:path'

import StyleTransform from './transforms'
import { Config, TransformOptions } from './types'

const RN_CSS_EXT = ['.css', '.scss', '.sass', '.less', '.styl', '.stylus']
const upstreamTransformer = require('@react-native/metro-babel-transformer')

// Configuration objects are immutable for the lifetime of a Metro transform session.
// Weak keys allow completed project sessions to be collected.
const styleTransforms = new WeakMap<Config, StyleTransform>()
const emptyConfig: Config = {}

function getStyleTransform (config: Config = emptyConfig) {
  let transformer = styleTransforms.get(config)
  if (!transformer) {
    transformer = new StyleTransform(config)
    styleTransforms.set(config, transformer)
  }
  return transformer
}

type TransformInput = { src: string; filename: string; options: TransformOptions }

export async function transform (
  src: string | TransformInput,
  filename?: string,
  options?: TransformOptions
) {
  const input: TransformInput = typeof src === 'string'
    ? { src, filename: filename!, options: options! }
    : src
  const { src: source, filename: file, options: opts } = input
  const ext = path.extname(file)
  if (RN_CSS_EXT.includes(ext)) {
    const styleTransform = getStyleTransform(opts.config)
    const styles = await styleTransform.transform(source, file, opts)
    return upstreamTransformer.transform({
      src: styles,
      filename: file,
      options: opts
    })
  }
  return upstreamTransformer.transform({ src: source, filename: file, options: opts })
}

export function rollupTransform (options: TransformOptions) {
  return {
    name: 'rn-style-transformer', // this name will show up in warnings and errors
    async transform (src: string, filename: string) {
      const ext = path.extname(filename)
      if (RN_CSS_EXT.includes(ext)) {
        const styleTransform = getStyleTransform(options.config)
        const code = await styleTransform.transform(src, filename, options)
        return { code }
      }
    }
  }
}
