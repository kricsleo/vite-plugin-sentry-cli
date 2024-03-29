
import type {
  SentryCliOptions,
  SentryCliCommitsOptions,
  SentryCliUploadSourceMapsOptions,
  SentryCliNewDeployOptions
} from '@sentry/cli'
import type { Plugin, ResolvedConfig } from 'vite';
import SentryCli from '@sentry/cli';
import rimraf from 'rimraf'
import { normalize } from 'path'

export interface VitePluginSentryCliSourcemap extends Omit<SentryCliUploadSourceMapsOptions, 'include'> {
  /**
   * sourcemap paths
   * @default [`./${vite.build.outDir}/${vite.build.assetsDir}`]
   */
  include?: SentryCliUploadSourceMapsOptions['include'];
  /**
   * !IMPORTANT!: MUST START WITH `~/`
   * @default `~${vite.env.BASE_URL}assets/`
   */
  urlPrefix?: SentryCliUploadSourceMapsOptions['urlPrefix'];
}

export interface VitePluginSentryCliDeploy extends Omit<SentryCliNewDeployOptions, 'env'> {
  /**
   * environment
   * @default `vite.mode`
   */
  env?: SentryCliNewDeployOptions['env']
}

/** options for plugin */
export interface VitePluginSentryCliOptions extends SentryCliOptions {
  /**
   * The URL of the Sentry
   */
  url: string;
  /**
   * Orgination name in Sentry
   */
  org: string;
  /**
   * Project name in Senrty
   */
  project: string;
  /**
   * Auth token
   */
  authToken: string;
  /**
   * Release version,
   * auto generated by git commit hash,
   * you can also config it by yourself
   */
  release?: string;
  /**
   * sourcemap configs
   */
  sourcemap?: VitePluginSentryCliSourcemap;
  /**
   * deploy configs
   */
  deploy?: VitePluginSentryCliDeploy;
  /**
   * if delete local sourcemap after uploaded,
   * @default true
   */
  clean?: boolean;
  /**
   * if delete remote previous sourcemap in Sentry under the same `release`
   * @default true
   */
  delete?: boolean;
  /**
   * if finalize a release after uploaded
   * @default true
   */
  finalize?: boolean;
  /**
   * path of config file
   */
  configFile?: string;
  /**
   * commits configs
   */
  commits?: SentryCliCommitsOptions;
}

/**
 * 默认配置
 */
export const defaultOptions: Partial<VitePluginSentryCliOptions> = {
  finalize: true,
  clean: true,
  delete: true
}

/** plugin factory */
export function vitePluginSentryCli(options: VitePluginSentryCliOptions) {
  const opts = Object.assign({}, defaultOptions, options)
  const cli = new SentryCli(opts.configFile, opts)
  let config: ResolvedConfig

  let releasePromise = opts.release ? Promise.resolve(opts.release)
    : cli.releases.proposeVersion().catch(e => {
      this.warn(`Auto get \`release\` failed: ${e.message}`)
      return ''
    })

  const plugin: Plugin = {
    name: 'vite-plugin-sentry-cli',
    // run it at last
    enforce: 'post',
    // only apply it when `build` & `sourcemap`
    apply({ build }, { command }) {
      return !!(command === 'build' && build?.sourcemap)
    },
    // inject env variables
    async config() {
      const release = await releasePromise
      return {
        define: {
          'import.meta.env.SENTRY_RELEASE': JSON.stringify(release)
        }
      }
    },
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    // start to upload sourcemap after bundled
    async closeBundle() {
      const { sourcemap, commits, clean, delete: deleteRemote, finalize, deploy } = opts;
      const { isProduction, mode, build, env } = config;
      if(!build.sourcemap) {
        this.warn('No sourcemap found, won\'t upload sourcemap, you can config `vite.build.sourcemap`.')
        return;
      }
      const release = await releasePromise
      if(!release) {
        this.warn('No `release` found, won\'t upload sourcemap, you can config `release` in this plugin.')
        return
      }
      !isProduction && this.warn(`Running in non-production mode: ${mode}`)
      try {
        // create a new release
        await cli.releases.new(release)
        // delete previous releases
        deleteRemote && await cli.execute(
          ['releases', 'files', release, 'delete', '--all'],
          true
        )
        // upload sourcemap
        const include = sourcemap?.include || [normalize(`./${build.outDir}/${build.assetsDir}`)]
        const urlPrefix = sourcemap?.urlPrefix || normalize(`~${env.BASE_URL}/${build.assetsDir}/`)
        await cli.releases.uploadSourceMaps(release, { ...sourcemap, include, urlPrefix })
        // set commits
        const shouldCommit = commits?.auto || (commits?.repo && commits?.commit)
        shouldCommit && await cli.releases.setCommits(release, commits)
        // finalize release
        finalize && await cli.releases.finalize(release)
        // set delploy
        const deployEnv = deploy?.env || mode
        await cli.releases.newDeploy(release, { ...deploy, env: deployEnv})
        // delete sourcemap after all is done
        clean && await deleteFile(`${build.outDir}/**/*.js.map`)
      } catch(e) {
        this.warn(`Uploading sourcemap error: ${e.message}`);
      }
    }
  }
  return plugin;
}

/**
 * delete files
 * @param path file path
 */
export function deleteFile(path) {
  return new Promise<void>((rs, rj) => rimraf(path, e => e ? rj(e) : rs()))
}