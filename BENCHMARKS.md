# Benchmarks

This repo includes two benchmark modes. One uses generated routes to measure
rule overhead in isolation. The other reuses a real `pages/` directory so you
can see how the rules behave on an actual project.

1. `single`: Lints one large file string. This keeps the measurement close to
   the rule itself.
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

## Latest results (2026-06-11)

All runs below used `--mode files --rules mixed --suggest true`. Each result is
the average of 5 runs on Node `v22.22.2` on macOS.

| Scenario | Routes | Statements | Files | Avg | P95 |
| --- | --- | --- | --- | --- | --- |
| Synthetic (generated) | 6000 | 12000 | 80 | 2.63 ms | 3.69 ms |
| Real project pages dir | 48 | 12000 | 80 | 2.26 ms | 2.91 ms |
| Fixture pages dir | 8 | 12000 | 80 | 2.33 ms | 2.92 ms |

Commands used:

```bash
node scripts/benchmark.js --routes 3000 --statements 12000 --iterations 50 --warmup 2 --suggest true --mode files --files 80 --rules mixed
node scripts/benchmark.js --pages-dir "/absolute/path/to/real/pages" --statements 12000 --iterations 50 --warmup 2 --suggest true --mode files --files 80 --rules mixed
node scripts/benchmark.js --pages-dir tests/fixtures/pages --statements 12000 --iterations 50 --warmup 2 --suggest true --mode files --files 80 --rules mixed
```

Run 5 times and average:

```bash
node -e "const {execFileSync}=require('child_process');const runs=5;const args=['scripts/benchmark.js','--routes','3000','--statements','12000','--iterations','50','--warmup','2','--suggest','true','--mode','files','--files','80','--rules','mixed','--json','true'];const results=[];for(let i=0;i<runs;i+=1){results.push(JSON.parse(execFileSync(process.execPath,args,{encoding:'utf8'})));}const avg=(key)=>results.reduce((sum,r)=>sum+r[key],0)/results.length;console.log({runs,avgMs:avg('avgMs'),p95Ms:avg('p95Ms')});"
```

Results vary by machine and workload. Compare relative changes, not absolute numbers.

## Notes

1. `files` mode is closer to a real ESLint run.
2. `single` mode is useful when you want to isolate rule overhead.
3. Benchmarks vary by machine, so compare relative changes instead of absolute numbers.
