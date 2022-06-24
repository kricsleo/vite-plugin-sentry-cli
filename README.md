# A plugin for intergrating `Sentry` to `Vite ⚡️`

It can upload sourcemap files to `Sentry` during compiling, so that when debugging issues in `Sentry`, you can reveal the source code.

It's designed for `Vite`, if you need to use it in `Webpack`, please see [`I haven't finished yet`](#)

It's based on [@sentry/cli](https://www.npmjs.com/package/@sentry/cli), and inspired by [vite-plugin-sentry](https://www.npmjs.com/package/vite-plugin-sentry)!

## Usage

### Install

```bash
# npm i -D vite-plugin-sentry-cli
yarn add -D vite-plugin-sentry-cli
```

### Config

It should be configed in the [`vite.config.ts`](https://vitejs.dev/config/)(or something else you named it in your project).

```ts
import { defineConfig } from 'vite';
import { vitePluginSentryCli } from 'vite-plugin-sentry-cli'

export default defineConfig({
  plugins: [
    //...
    // the minimun required config
    vitePluginSentryCli({
      url: '<your_sentry_url>',
      org: '<your_sentry_orgination>',
      project: '<your_sentry_project>',
      authToken: '<your_sentry_auth_token>'
    }),
    //...
  ]
})
```

## Default behaviour

1. `clean: true`

  After sourcemap is uploaded, **it will delete local `*.js.map` files by default**, to avoid publish these sourcemap to the production during your following steps.

  If you want to keep them, set it to `false`.


2. `delete: true`

  Before upload sourcemap, **it will delete all previous sourcemap files in the same `release` by default**, it's just better for your server storage and would be cleaner in a release(just in my point).

  If you want to keep them in your Senrtry, set it to `false`.

##  Q & A

- What's `release`?

  When no `release` is configged, it will generate a `release` by `SentryCli.releases.proposeVersion()`(the project should be a `git` repository in this situation), an auto-generated `release` is the lastest commit hash.

  You can also use the `release` in your source code with `import.meta.env.SENTRY_RELEASE`(It's automaticly injected). When you configged  your own `release`, this variable will be the value as you configged.

  For `ts` support, you can add this config to your `tsconfig.json`

  ```
  {
    "compilerOptions": {
      "types": ["vite-plugin-sentry-cli/client"]
    }
  }
  ```

- What's `authToken` and how can I get one?

  `authToken` is required for `sentry-cli` to get access to your `Sentry` application, it will be used to upload sourcemap and publish new release in your name.

  Visit your auth token user setting page(like: https://<your_sentry_url>/settings/account/api/auth-tokens/), or following these steps: Login in Sentry -> Click your avatar to navigate to `Account Details` -> Select `Auth Tokens` menu -> Use an exsited auth token or create a new one.

  This auth token should include `project:read`/`project:releases`/`org:read` scopes at least, that should be already included by default:)

- More configs?

  You might want to check more configs or details here: [Configuration and Authentication](https://docs.sentry.io/product/cli/configuration/)
