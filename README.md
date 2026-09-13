# eslint-plugin-next-pages-router

[![npm version](https://img.shields.io/npm/v/@mertcreates/eslint-plugin-next-pages-router.svg)](https://www.npmjs.com/package/@mertcreates/eslint-plugin-next-pages-router)
[![npm downloads](https://img.shields.io/npm/dm/@mertcreates/eslint-plugin-next-pages-router.svg)](https://www.npmjs.com/package/@mertcreates/eslint-plugin-next-pages-router)
[![license](https://img.shields.io/npm/l/@mertcreates/eslint-plugin-next-pages-router.svg)](LICENSE)
[![CI](https://github.com/mertcreates/eslint-plugin-next-pages-router/actions/workflows/ci.yml/badge.svg)](https://github.com/mertcreates/eslint-plugin-next-pages-router/actions/workflows/ci.yml)

This ESLint plugin checks the paths in your Next.js Pages Router code against
the files in `pages/`. It reports typos and catches cases where code uses
`/posts/123` when it needs `/posts/[id]`, or the other way around.

Incorrect:

```js
router.route === '/posts/123'
router.push('/posts/[id]')
```

Correct:

```js
router.route === '/posts/[id]'
router.push({ pathname: '/posts/[id]', query: { id: '123' } })
```

This plugin grew out of a route comparison mistake that reached QA in a real
project.

[Read the short story behind it →](https://mertercan.com/making/eslint-next-pages-router)

The plugin supports projects that use the Pages Router (`pages/`).

If you use the App Router, Next.js built-in typed routes are usually the better
fit.

Using the Pages Router in an unusual setup?

If the plugin misses a route or flags a valid one, open an issue. Those edge
cases are the most useful input for making the rules more reliable.

## Install

```bash
npm i -D @mertcreates/eslint-plugin-next-pages-router
# or
yarn add -D @mertcreates/eslint-plugin-next-pages-router
# or
pnpm add -D @mertcreates/eslint-plugin-next-pages-router
# or
bun add -D @mertcreates/eslint-plugin-next-pages-router
```

## Quick fix

Enable `suggestClosestRoute` to get replacement suggestions in your editor's
Quick Fix menu. ESLint treats these as suggestions for you to apply manually.
Route checks run during linting; the TypeScript types described below provide
completion for configuration options.

This option is on by default in VS Code and off in the CLI. The plugin can also
suggest replacing separate path and URL arguments with a URL object containing
`pathname` and `query` when it can work out the parameter values.

## Contents

- [Install](#install)
- [Quick fix](#quick-fix)
- [Features](#features)
- [Usage (flat config)](#usage-flat-config)
- [Usage (eslintrc)](#usage-eslintrc)
- [Rules](#rules)
- [Options](#options)
- [TypeScript config completion](#typescript-config-completion)
- [Compatibility](#compatibility)
- [Benchmarks](#benchmarks)
- [License](#license)

## Features

- Flags `router.route`, `router.pathname`, and `router.asPath` comparisons
  using `===`, `==`, `!==`, `!=`, `.includes()`, and `switch`
- Checks `router.push` / `router.replace` plus `next/link` `href` and `as`
- Recognizes the default `next/router` import and routers assigned to a `const`
  from its `useRouter()` hook, even when you rename the imports. These are
  Pages Router imports; App Router projects use `next/navigation`.
- Distinguishes page paths with placeholders (`/posts/[id]`) from URLs that
  match those pages (`/posts/123`); static paths such as `/about` are valid
  as written
- Reads string literals, strings assigned to a plain `const` variable, and
  templates built from those strings. Static string checks cover values known
  in the current file. Mutable variables, imports, function parameters, calls,
  and templates with runtime values fall outside that scope.
- Handles query strings, hashes, trailing slashes, `basePath`, and locales
- Offers ESLint suggestions where safe

## Usage (flat config)

Use this form for ESLint 9 and new ESLint 8 flat-config setups:

```js
const nextRouting = require('@mertcreates/eslint-plugin-next-pages-router');

module.exports = [
  nextRouting.configs['flat/recommended'],
];
```

## Usage (eslintrc)

Use this form for legacy `.eslintrc` projects:

```json
{
  "extends": ["plugin:@mertcreates/next-pages-router/recommended"]
}
```

## Rules

The recommended config enables both rules.

### `@mertcreates/next-pages-router/no-invalid-route-compare`

This rule checks that:

- `router.route` and `router.pathname` must match page paths that
  exist in `pages/`, including static paths such as `'/about'` and paths with
  placeholders such as `'/posts/[id]'`.
- Compare `router.asPath` with a URL that matches an existing page, such
  as `'/about'` or `'/posts/123'`.
- Query strings or hashes (`?` / `#`) are only used with `asPath`.

With `suggestClosestRoute` enabled, the rule suggests possible replacements.
This is on by default in VS Code and off in the CLI.

Incorrect:

```js
router.route === '/posts/123'
router.asPath === '/posts/[id]'
```

Correct:

```js
router.route === '/posts/[id]'
router.asPath === '/posts/123?sort=asc'
```

### `@mertcreates/next-pages-router/no-invalid-router-navigation`

This rule checks `router.push` / `router.replace` arguments and `next/link`
`href` / `as` props:

- String URLs must match a page in `pages/`; static paths such as `/about` are
  valid as written. A path with dynamic placeholders such as `/posts/[id]`
  needs parameter values in the URL, such as `/posts/123`.
- URL objects may use a page path with placeholders in `pathname` and
  provide values in `query`, or use any URL that matches a page directly.
- If you pass a string with placeholders, also pass an `as` URL with the
  parameter values filled in.
- `as` must match a page; it may be a static URL such as `/about` or a URL with
  parameter values such as `/posts/123`. Fill in any placeholders before using
  the URL as `as`.

With `preferUrlObject` enabled, the rule suggests a URL object for
`router.push(pattern, as)` and `<Link href={pattern} as={as}>` when it can
convert the arguments safely.

Incorrect:

```js
router.push('/unknown')
router.push('/posts/[id]')
```

Correct:

```js
router.push('/about')
router.push('/posts/123')
router.push({ pathname: '/posts/[id]', query: { id: '123' } })
```

Leave out `routerObjects` to let the rules recognize routers from their
`next/router` imports, including renamed imports and local variables:

```js
import NextRouter, { useRouter as usePageRouter } from 'next/router';

const navigation = usePageRouter();
NextRouter.push('/about');
navigation.replace('/posts/123');
```

Automatic detection covers direct ES imports and `const` results from
`useRouter()`. With `require` calls, alias chains, or custom wrappers, list the
router object in `routerObjects` and call its methods on that object:

```js
const navigation = createRouter();
navigation.push('/about');
```

```json
{ "routerObjects": ["navigation"] }
```

For a static page, pass its path directly: `router.push('/about')`,
`router.replace('/about')`, or `<Link href='/about' />`. The
[navigation tests](tests/rules/no-invalid-router-navigation.test.js) include
examples of each.

Incorrect:

```jsx
<Link href="/posts/[id]" />
```

Correct:

```jsx
<Link href="/posts/123" />
<Link href={{ pathname: '/posts/[id]', query: { id: '123' } }} />
```

## Options

You can use the defaults or pass an options object after the rule's severity.
Set options separately for each rule; some apply only to comparisons.

```json
{
  "rules": {
    "@mertcreates/next-pages-router/no-invalid-route-compare": [
      "warn",
      {
        "pagesDir": "pages",
        "readNextConfig": true,
        "nextConfigPath": "./apps/web/next.config.js",
        "basePath": "/docs",
        "locales": ["en", "tr"],
        "routerObjects": ["router", "Router", "props.router"],
        "routeProperties": ["route", "pathname"],
        "checkEquality": true,
        "checkIncludes": true,
        "checkSwitch": true,
        "warnOnUnknownPaths": true,
        "suggestClosestRoute": true,
        "skipIfPagesDirMissing": true
      }
    ],
    "@mertcreates/next-pages-router/no-invalid-router-navigation": [
      "warn",
      {
        "pagesDir": "pages",
        "readNextConfig": true,
        "nextConfigPath": "./apps/web/next.config.js",
        "basePath": "/docs",
        "locales": ["en", "tr"],
        "routerObjects": ["router", "Router", "props.router"],
        "warnOnUnknownPaths": true,
        "suggestClosestRoute": true,
        "preferUrlObject": true,
        "skipIfPagesDirMissing": true
      }
    ]
  }
}
```

Option reference:

| Option | Type | Default | Applies to | Description |
| --- | --- | --- | --- | --- |
| `pagesDir` | `string` | `"pages"` | both | Path to your Next.js pages directory. |
| `readNextConfig` | `boolean` | `false` | both | Reads `basePath` and `i18n.locales` from `next.config.js`, `next.config.cjs`, `next.config.mjs`, or `next.config.json` when enabled. |
| `nextConfigPath` | `string` | `""` | both | Optional path to a Next config file when `readNextConfig` is on. |
| `basePath` | `string` | `""` | both | Overrides the value from Next config. |
| `locales` | `string[]` | `[]` | both | Overrides the value from Next config. |
| `routerObjects` | `string[]` | Automatic detection, with `router` / `Router` as fallback names | both | By default, detects `next/router` imports and `const` results from `useRouter()`, with a name fallback for `router` and `Router` when their source is uncertain. A supplied list defines the complete set of names or member paths to check. An empty list (`[]`) allows any object name or member path. |
| `routeProperties` | `string[]` | `["route","pathname"]` | compare | Router fields treated as page paths. |
| `checkEquality` | `boolean` | `true` | compare | Checks `===`, `==`, `!==`, and `!=` comparisons. |
| `checkIncludes` | `boolean` | `true` | compare | Enables `includes(...)` checks. |
| `checkSwitch` | `boolean` | `true` | compare | Enables `switch (...)` checks. |
| `warnOnUnknownPaths` | `boolean` | `true` | both | Reports unknown paths in `asPath` comparisons and navigation targets. |
| `suggestClosestRoute` | `boolean` | `true` in VS Code, `false` in CLI | both | Adds "Did you mean" suggestions. This overrides the default behavior when set. |
| `preferUrlObject` | `boolean` | `true` | navigation | Reports legacy `router.push(pattern, as)` usage and prefers a URL object with `pathname` + `query`. |
| `skipIfPagesDirMissing` | `boolean` | `true` | both | Runs checks only in projects where `pagesDir` exists. Useful in monorepos and builds that include other project types. |

With `readNextConfig` enabled, the plugin reads `next.config.js`,
`next.config.cjs`, `next.config.mjs`, or `next.config.json` from the project
root. It loads CommonJS files with `require`, which can run code at the top
level of the config file during linting. For `next.config.mjs`, synchronous
reading supports static `export default { ... }` objects. Use the rule's
`basePath` and `locales` options for values from dynamic ESM exports.

## TypeScript config completion

TypeScript types are included for the rules and presets. Give an options
object a type to get editor suggestions and check its options against the
chosen rule:

```ts
import plugin = require('@mertcreates/eslint-plugin-next-pages-router');

const compareOptions = {
  pagesDir: 'pages',
  checkSwitch: false,
} satisfies plugin.CompareOptions;

const navigationOptions: plugin.NavigationOptions = {
  preferUrlObject: true,
};
```

The types cover `plugin.rules`, `plugin.configs.recommended`, and
`plugin.configs['flat/recommended']`. Option checking uses the explicit types
shown above. Completion covers the configuration; the lint rules validate
route strings.

ESLint 8 gets the types it needs through the package's `@types/eslint`
dependency. If your project uses ESLint 8 APIs directly, you may also want
`@types/eslint` in your own dependencies. ESLint 9 ships its own types.

## Compatibility

- Node: `>=16`
- ESLint: `8` or `9`
- Next.js: `>=10` (Pages Router)

## Benchmarks

See [BENCHMARKS.md](BENCHMARKS.md) for the benchmark setup, measurements, and
results.

## License

MIT.
