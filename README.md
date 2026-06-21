# eslint-plugin-next-pages-router

[![npm version](https://img.shields.io/npm/v/@mertcreates/eslint-plugin-next-pages-router.svg)](https://www.npmjs.com/package/@mertcreates/eslint-plugin-next-pages-router)
[![npm downloads](https://img.shields.io/npm/dm/@mertcreates/eslint-plugin-next-pages-router.svg)](https://www.npmjs.com/package/@mertcreates/eslint-plugin-next-pages-router)
[![license](https://img.shields.io/npm/l/@mertcreates/eslint-plugin-next-pages-router.svg)](LICENSE)
[![CI](https://github.com/mertcreates/eslint-plugin-next-pages-router/actions/workflows/ci.yml/badge.svg)](https://github.com/mertcreates/eslint-plugin-next-pages-router/actions/workflows/ci.yml)

This ESLint plugin flags invalid Pages Router route comparisons and navigation
calls. It checks route literals and statically resolved strings against your
`pages/` tree so typos and mismatched dynamic patterns fail in lint.

This plugin grew out of a route comparison mistake that reached QA in a real
project.

[Read the short story behind it →](https://mertercan.com/making/eslint-next-pages-router)

It only covers the Pages Router. App Router (`app/`) is out of scope.

If you use the App Router, Next.js built-in typed routes are usually the better
fit.

Using the Pages Router in an unusual setup?

If the plugin misses a route or flags a valid one, open an issue. Those edge
cases are the most useful input for making the rules more reliable.

## Contents

- [Features](#features)
- [Install](#install)
- [Usage (flat config)](#usage-flat-config)
- [Usage (eslintrc)](#usage-eslintrc)
- [Rules](#rules)
- [Options](#options)
- [Compatibility](#compatibility)
- [Benchmarks](#benchmarks)
- [License](#license)

## Features

- Flags `router.route`, `router.pathname`, and `router.asPath` comparisons
  using `===`, `==`, `!==`, `!=`, `.includes()`, and `switch`
- Checks `router.push` / `router.replace` plus `next/link` `href` and `as`
- Distinguishes patterns (`/posts/[id]`) from concrete paths (`/posts/123`)
- Resolves string literals, `const` strings, and simple static templates
- Handles query strings, hashes, trailing slashes, `basePath`, and locales
- Offers ESLint suggestions where safe

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

- `router.route` and `router.pathname` are compared against **route patterns**
  that exist in `pages/` (e.g. `'/posts/[id]'`).
- `router.asPath` is compared against **concrete URLs** (e.g. `'/posts/123'`)
  and matches an existing pages route.
- Query strings or hashes (`?` / `#`) are only used with `asPath`.

When `suggestClosestRoute` is enabled, the rule can offer **ESLint suggestions**
(default: on in VS Code, off in CLI).

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

- String URLs must be **concrete** and match a pages route.
- URL objects may use a **route pattern** in `pathname` with `query`, or a
  **concrete** `pathname` that matches a pages route.
- Passing a pattern string is only valid when an `as` URL is provided.
- `as` must be a concrete URL (no route patterns).

With `preferUrlObject` enabled, legacy `router.push(pattern, as)` and
`<Link href={pattern} as={as}>` forms are reported when a safe UrlObject
suggestion can be built.

Incorrect:

```js
router.push('/unknown')
router.push('/posts/[id]')
```

Correct:

```js
router.push('/posts/123')
router.push({ pathname: '/posts/[id]', query: { id: '123' } })
```

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

All options are optional and go in the first rule config object. Each rule has
its own options, and some only apply to the compare rule.

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
| `routerObjects` | `string[]` | `["router", "Router"]` | both | Allowed router identifiers or member paths, such as `"router"` or `"props.router"`. |
| `routeProperties` | `string[]` | `["route","pathname"]` | compare | Router fields treated as route patterns. |
| `checkEquality` | `boolean` | `true` | compare | Enables `===` and `==` checks. |
| `checkIncludes` | `boolean` | `true` | compare | Enables `includes(...)` checks. |
| `checkSwitch` | `boolean` | `true` | compare | Enables `switch (...)` checks. |
| `warnOnUnknownPaths` | `boolean` | `true` | both | Warns when `asPath` or navigation targets do not match a known pages route. |
| `suggestClosestRoute` | `boolean` | `true` in VS Code, `false` in CLI | both | Adds "Did you mean" suggestions. This overrides the default behavior when set. |
| `preferUrlObject` | `boolean` | `true` | navigation | Reports legacy `router.push(pattern, as)` usage and prefers a UrlObject with `pathname` + `query`. |
| `skipIfPagesDirMissing` | `boolean` | `true` | both | Skips checks when `pagesDir` does not exist, which is useful in monorepos or non-Next builds. |

When `readNextConfig` is enabled, this plugin reads `next.config.js`,
`next.config.cjs`, `next.config.mjs`, or `next.config.json` from the project
root. CommonJS config files are loaded with `require`, so any top-level config
code can run during linting. Static `next.config.mjs` files with an
`export default { ... }` object are supported synchronously. Dynamic ESM config
files are skipped.

## Compatibility

- Node: `>=16`
- ESLint: `8` or `9`
- Next.js: `>=10` (Pages Router)

## Benchmarks

These benchmarks measure **rule overhead**, not total ESLint time.

Latest run, mixed mode, 12k statements across 80 files, 5-run average on
Node `v22.22.2`:

- Real project pages dir (48 routes): 2.26 ms average, 2.91 ms p95
- Synthetic stress (6000 routes): 2.63 ms average, 3.69 ms p95

See [BENCHMARKS.md](BENCHMARKS.md) for the full setup.

## License

MIT.
