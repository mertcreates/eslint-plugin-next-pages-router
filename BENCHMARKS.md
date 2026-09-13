# Benchmarks

This repo can use generated routes or an existing `pages/` directory. Both
sources support two benchmark modes:

1. `single`: Lints one large file string, including parsing and rule initialization.
2. `files`: Lints many files from disk. This adds file I/O and parsing cost.

## Quick start

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

## Verified comparison (2026-09-13)

This comparison uses version 1.2.0 at `f42f9ee` and the 1.2.1 source. Each
version ran in four fresh Node processes. Each process used 2 warmup iterations
followed by 10 measured iterations. Runs alternated between versions to reduce
ordering bias.

The machine ran Node `v22.22.2`, npm `10.9.7`, ESLint `9.39.2`, and macOS
`26.6.2` on arm64. Timings cover the whole batch, including file reads, parsing,
rule initialization, and reporting.

| Scenario | 1.2.0 avg | 1.2.1 avg | Delta | 1.2.0 avg range | 1.2.1 avg range | Mean P95, 1.2.0 to 1.2.1 | Diagnostics/run, 1.2.0 to 1.2.1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Synthetic, generated routes | 396.22 ms | 393.60 ms | -0.7% | 388.39 to 406.50 ms | 387.01 to 398.45 ms | 423.54 to 409.07 ms | 232 to 232 |
| Fixture pages directory | 54.65 ms | 55.36 ms | +1.3% | 53.56 to 56.03 ms | 53.82 to 57.03 ms | 62.27 to 61.86 ms | 941 to 1091 |

The process ranges overlap in both scenarios. These samples do not show a
measurable speedup or regression.

The synthetic workload includes URL objects, but its generated `query: { id }`
values satisfy the generated dynamic routes. Its diagnostic count is unchanged.
The fixture workload uses the same query shape against routes with other
required parameter names. Version 1.2.1 reports 150 additional diagnostics, so
this scenario exercises the missing query parameter check.

Commands used:

```bash
node scripts/benchmark.js --routes 1000 --statements 4000 --iterations 10 --warmup 2 --suggest true --mode files --files 100 --rules mixed --json true
node scripts/benchmark.js --pages-dir tests/fixtures/pages --statements 4000 --iterations 10 --warmup 2 --suggest true --mode files --files 100 --rules mixed --json true
```

The commands are useful for comparing revisions on the same machine. These
local macOS results do not predict CI or production performance.

## Notes

1. `files` mode is closer to a real ESLint run.
2. Neither mode subtracts an ESLint-only baseline; these are not isolated plugin costs.
3. Benchmarks vary by machine, so compare revisions under the same conditions.
4. Parsing/configuration failures abort the benchmark. An untimed check confirms
   that each enabled rule reports a known invalid input, even for all-valid workloads.
5. `diagnosticsPerRun` records the cold workload's diagnostic count; the rule
   check is not included. In real-project mode the route manifest is loaded to
   generate input before timing, so `coldRunMs` is not a cold manifest load.
