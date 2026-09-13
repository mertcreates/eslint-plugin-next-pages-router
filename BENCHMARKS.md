# Benchmarks

This repo can use generated routes or an existing `pages/` directory. Both
sources support two benchmark modes:

1. `single`: Lints one large file string, including parsing and rule initialization.
2. `files`: Lints many files from disk. This adds file I/O and parsing cost.

## Quick Start

```bash
node scripts/benchmark.js
```

## Synthetic route set

```bash
node scripts/benchmark.js --mode files --routes 5000 --files 200 --iterations 20 --suggest true --rules mixed
```

## Real project mode

Point the benchmark at an existing `pages/` directory to use your real route set:

```bash
node scripts/benchmark.js \
  --pages-dir "/absolute/path/to/pages" \
  --mode files \
  --files 80 \
  --statements 12000 \
  --iterations 50 \
  --warmup 2 \
  --suggest true \
  --rules mixed
```

## Suggestions cost

```bash
node scripts/benchmark.js --mode files --routes 1000 --files 100 --iterations 20 --suggest false --rules mixed
node scripts/benchmark.js --mode files --routes 1000 --files 100 --iterations 20 --suggest true --rules mixed
```

## JSON output

```bash
node scripts/benchmark.js --mode files --routes 1000 --files 100 --iterations 20 --suggest true --rules mixed --json true
```

## Options

| Option | Type | Default | Applies to | Description |
| --- | --- | --- | --- | --- |
| `--routes` | `number` | `400` | synthetic | Number of route folders to generate. |
| `--pages-dir` | `string` | `""` | real | Use an existing `pages/` directory instead of generating routes. |
| `--iterations` | `number` | `50` | both | Number of measured runs. |
| `--warmup` | `number` | `1` | both | Warmup runs before measuring. |
| `--suggest` | `boolean` | `false` | both | Enable route suggestions. |
| `--mode` | `single\|files` | `single` | both | Benchmark mode. |
| `--rules` | `compare\|navigation\|mixed` | `mixed` | both | Which rules to enable. |
| `--files` | `number` | `50` | files | Number of files when using `files` mode. |
| `--statements` | `number` | `routes*4` | both | Number of statements to generate. |
| `--navigation-ratio` | `number` | `0.3` | mixed | Ratio of navigation statements in mixed mode. |
| `--json` | `boolean` | `false` | both | Output JSON only. |

## Verified results (2026-09-12)

The previous June results were invalid: ESLint skipped the temporary filenames
with "No matching configuration found", and the benchmark discarded those
messages. Do not compare those timings with the corrected results.

Each result below is one process with 2 warmup iterations and 10 measured
iterations on Node `v22.22.2`, ESLint `9.39.4`, macOS. Both use
`--mode files --rules mixed --suggest true`. Timings cover the complete batch,
including file reads, parsing, rule initialization and reporting.

| Scenario | Routes | Statements | Files | Diagnostics/run | Avg | P95 |
| --- | --- | --- | --- | --- | --- | --- |
| Synthetic (generated) | 2000 | 4000 | 100 | 232 | 398.37 ms | 414.24 ms |
| Fixture pages dir | 8 | 4000 | 100 | 941 | 58.00 ms | 69.87 ms |

Commands used:

```bash
node scripts/benchmark.js --routes 1000 --statements 4000 --iterations 10 --warmup 2 --suggest true --mode files --files 100 --rules mixed --json true
node scripts/benchmark.js --pages-dir tests/fixtures/pages --statements 4000 --iterations 10 --warmup 2 --suggest true --mode files --files 100 --rules mixed --json true
```

With the corrected benchmark but before connecting the matcher index, the same
synthetic command averaged 402.84 ms with 232 diagnostics. The change to
398.37 ms is too small in these single-process samples to claim an overall
speedup. Regression tests separately prove that unrelated regex checks are
skipped and suggestion ordering is preserved.

Results vary by machine and workload. Compare relative changes, not absolute numbers.

## Notes

1. `files` mode is closer to a real ESLint run.
2. Neither mode subtracts an ESLint-only baseline; these are not isolated plugin costs.
3. Benchmarks vary by machine, so compare relative changes instead of absolute numbers.
4. Parsing/configuration failures abort the benchmark. An untimed check confirms
   that each enabled rule reports a known invalid input, even for all-valid workloads.
5. `diagnosticsPerRun` records the cold workload's diagnostic count; the rule
   check is not included. In real-project mode the route manifest is loaded to
   generate input before timing, so `coldRunMs` is not a cold manifest load.
