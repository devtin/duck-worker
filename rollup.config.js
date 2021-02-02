import path from 'path'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import alias from '@rollup/plugin-alias'
import { name, version, author, license } from './package.json'

const fromSrc = (...paths) => {
  return path.join(__dirname, 'src', ...paths)
}

const plugins = [
  alias({
    entries: [
      {
        find: 'src',
        replacement: fromSrc()
      },
      {
        find: 'lib',
        replacement: fromSrc('lib')
      }
    ]
  }),
  json(),
  commonjs({
    // non-CommonJS modules will be ignored, but you can also
    // specifically include/exclude files
    exclude: ['src/**/*'],
    // if true then uses of `global` won't be dealt with by this plugin
    ignoreGlobal: true, // Default: false

    // if false then skip sourceMap generation for CommonJS modules
    sourceMap: true // Default: true
  })
]
const cleanName = name.indexOf('/') >= 0 ? name.split('/')[1] : name
const banner = `/*!
 * ${ name } v${ version }
 * (c) 2020-${ new Date().getFullYear() } ${ author }
 * ${ license }
 */`

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: `dist/${ cleanName }.js`,
        format: 'cjs',
        banner
      },
    ],
    plugins
  },
  {
    input: 'src/index.js',
    output: [
      {
        file: `dist/${ cleanName }.mjs`,
        format: 'esm',
        banner
      }
    ],
    plugins
  },
]
