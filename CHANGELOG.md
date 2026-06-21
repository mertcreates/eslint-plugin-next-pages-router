# Changelog

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
