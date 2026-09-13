# Changelog

## [1.2.0] - 2026-09-13

### Added

- Route comparisons resolve local `const` strings and static templates in equality checks, array `.includes()` calls, and `switch` cases.
- Router detection recognizes renamed default imports from `next/router` and `const` results from its `useRouter()` hook. Explicit `routerObjects` lists control which objects the rules check; an empty list allows any object.
- TypeScript types provide completion for rule names, presets, and explicitly typed options. The package includes `@types/eslint` for ESLint 8 consumers.
- CI checks configuration completion and type errors, including CommonJS and ES module imports from the packed package.

### Changed

- Lint messages and Quick Fix descriptions use plainer language. Users apply suggestions through their editor's Quick Fix menu.
- Both rules use the dynamic route index to select candidate routes. Removed unused cache fields.
- README explanations cover router detection, static string support, and configuration completion.
- Test coverage focuses on real ESLint diagnostics and packed-package consumers, with dedicated checks for missing scope metadata.

### Fixed

- Automatic router detection ignores known unrelated objects, foreign imports, and `next/navigation` hook results. Reassigned or otherwise uncertain `router` / `Router` variables keep the name fallback.
- Static string resolution distinguishes plain `const` variables from destructuring patterns.
- Benchmarks measure files with active ESLint rules and stop on parsing or configuration failures. BENCHMARKS.md records the verified results.
- Package tests check type dependencies in isolated consumer installations.
- The publish workflow runs the Mocha suite and package type checks before publishing.

## [1.1.0] - 2026-06-11

### Added

- `next/link` validation for `href` values, including imported aliases and static string resolution.
- Scope-aware detection for `next/link` so local shadowed components are ignored.
- Shared AST helpers for route and JSX analysis.
- Route matcher indexing for faster dynamic route lookup.

### Changed

- `router.push` and `router.replace` now share the same navigation reporting path as `next/link`.
- Route comparison checks now use the shared route analysis and reporter layers.
- `basePath` and `i18n.locales` handling now lives in the shared rule context.
- Route cache invalidation now tracks watched directory mtimes and retries transient filesystem races once.

### Fixed

- `next/link` `href` values that come from static strings or template literals are now resolved before validation.
- `router` and `next/link` suggestions now use the shared UrlObject recommendation path.
- Pages route lookups now rebuild when the `pages/` tree changes.

### Documentation

- README examples and option descriptions now match the supported rule behavior more closely.
- Benchmark notes now describe the synthetic and real-project modes more directly.
