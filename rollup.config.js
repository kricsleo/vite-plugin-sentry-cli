import pkg from './package.json'
import commonjs from '@rollup/plugin-commonjs'
import autoExternal from 'rollup-plugin-auto-external'
import rollupTypescript from 'rollup-plugin-typescript2'

export default {
  input: 'src/index.ts',
  output: [
    {
      format: 'es',
      file: pkg.module,
      sourcemap: true,
      exports: 'auto'
    },
    {
      format: 'cjs',
      file: pkg.main,
      sourcemap: true,
      exports: 'auto'
    }
  ],
  plugins: [
    rollupTypescript({
      useTsconfigDeclarationDir: true
    }),
    autoExternal(),
    commonjs()
  ]
}