const {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} = require('fs');
const { join, basename } = require('path');
const { tmpdir } = require('os');
const { performance } = require('perf_hooks');
const { Linter } = require('eslint');
const compareRule = require('../rules/no-invalid-route-compare');
const navigationRule = require('../rules/no-invalid-router-navigation');
const { getRouteMatchers, ensureRouteLists } = require('../lib/routeData');
const { containsDynamicToken, normalizeTrailingSlash } = require('../lib/routes');

const RULE_COMPARE = '@mertcreates/next-pages-router/no-invalid-route-compare';
const RULE_NAVIGATION =
  '@mertcreates/next-pages-router/no-invalid-router-navigation';
const PLUGIN_NAME = '@mertcreates/next-pages-router';

function parseIntArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);

  if (idx === -1) {
    return fallback;
  }

  const raw = process.argv[idx + 1];
  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);

  if (idx === -1) {
    return fallback;
  }

  const raw = process.argv[idx + 1];

  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }

  return fallback;
}

function parseStringArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);

  if (idx === -1) {
    return fallback;
  }

  return process.argv[idx + 1] || fallback;
}

function parseFloatArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);

  if (idx === -1) {
    return fallback;
  }

  const raw = process.argv[idx + 1];
  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));

  return sorted[idx];
}

function stats(values) {
  if (!values.length) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p95: 0,
    };
  }

  let sum = 0;
  let min = values[0];
  let max = values[0];

  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  return {
    min,
    max,
    mean: sum / values.length,
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
  };
}

function printHelp() {
  console.log('Usage: node scripts/benchmark.js [options]');
  console.log('Options:');
  console.log('  --routes <n>       Number of route folders (default: 400)');
  console.log('  --iterations <n>   Number of measured runs (default: 50)');
  console.log('  --warmup <n>       Number of warmup runs (default: 1)');
  console.log('  --suggest <bool>   Enable suggestions (default: false)');
  console.log('  --mode <single|files>  Benchmark mode (default: single)');
  console.log('  --rules <compare|navigation|mixed>  Rules to benchmark (default: mixed)');
  console.log('  --pages-dir <path> Use existing pages directory');
  console.log('  --files <n>        Number of files in files mode (default: 50)');
  console.log('  --statements <n>   Number of statements (default: routes*4)');
  console.log('  --navigation-ratio <n>  Ratio for navigation statements (default: 0.3)');
  console.log('  --json <bool>      Output JSON only (default: false)');
}

if (process.argv.includes('--help')) {
  printHelp();
  process.exit(0);
}

const pagesDirArg = parseStringArg('pages-dir', '');
const iterations = parseIntArg('iterations', 50);
const warmup = parseIntArg('warmup', 1);
const suggestClosestRoute = parseBoolArg('suggest', false);
const jsonOnly = parseBoolArg('json', false);
const mode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1] || 'single'
  : 'single';
const rulesMode = parseStringArg('rules', 'mixed');
const filesCount = parseIntArg('files', 50);
const navigationRatio = Math.max(
  0,
  Math.min(1, parseFloatArg('navigation-ratio', 0.3))
);

let staticRoutesList = null;
let dynamicPatterns = null;
let realRoutesCount = null;

if (pagesDirArg) {
  const routeData = getRouteMatchers({
    pagesDir: pagesDirArg,
    cwd: process.cwd(),
    includeDynamicMatchers: true,
  });
  ensureRouteLists(routeData.cacheEntry);
  staticRoutesList = routeData.cacheEntry.staticRoutesList;
  dynamicPatterns = routeData.cacheEntry.dynamicPatterns;
  realRoutesCount = routeData.cacheEntry.routeSet.size;
}

const routesCount = parseIntArg('routes', realRoutesCount || 400);
const statementsCount = parseIntArg('statements', routesCount * 4);

const tempRoot = mkdtempSync(join(tmpdir(), 'eslint-next-pages-router-bench-'));
process.once('exit', () => rmSync(tempRoot, { recursive: true, force: true }));
const pagesDir = pagesDirArg || join(tempRoot, 'pages');

if (!pagesDirArg) {
  mkdirSync(pagesDir, { recursive: true });

  for (let i = 0; i < routesCount; i += 1) {
    const dir = join(pagesDir, `r${i}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.js'), 'export default function Page() {}');
    writeFileSync(join(dir, '[id].js'), 'export default function Page() {}');
  }
}

function pickFrom(list, fallback, index) {
  if (!list || list.length === 0) {
    return fallback;
  }

  return list[index % list.length];
}

function mutateRoute(route) {
  if (!route || route === '/') {
    return '/not-a-route';
  }

  const parts = route.split('/');

  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const segment = parts[i];
    if (!segment || segment.includes('[')) {
      continue;
    }
    parts[i] = segment.length > 1 ? segment.slice(0, -1) : segment + 'x';
    return normalizeTrailingSlash(parts.join('/')) || '/';
  }

  if (route.includes('[')) {
    return route.replace('[', '[x');
  }

  return route + '-x';
}

function concreteFromPattern(pattern, index) {
  if (!pattern) {
    return '/';
  }

  let path = pattern;

  path = path.replace(/\[\[\.\.\.[^\]]+\]\]/g, '');
  path = path.replace(/\[\.\.\.[^\]]+\]/g, '/a/b');
  path = path.replace(/\[[^\]]+\]/g, `value${index}`);
  path = path.replace(/\/+/g, '/');

  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  return normalizeTrailingSlash(path) || '/';
}

function ensureDynamicPattern(pattern, index) {
  if (pattern && containsDynamicToken(pattern)) {
    return pattern;
  }

  if (pattern && pattern !== '/') {
    return normalizeTrailingSlash(pattern) + '/[id]';
  }

  return `/item-${index}/[id]`;
}

function buildCompareLines(count) {
  const result = [];

  for (let i = 0; i < count; i += 1) {
    const idx = i % routesCount;
    const mod = i % 6;
    const fallbackStatic = `/r${idx}`;
    const staticRoute = pickFrom(staticRoutesList, fallbackStatic, idx);
    const patternBase = dynamicPatterns && dynamicPatterns.length
      ? pickFrom(dynamicPatterns, staticRoute, idx)
      : staticRoute;
    const concrete = containsDynamicToken(patternBase)
      ? concreteFromPattern(patternBase, idx)
      : staticRoute;
    const invalidPattern = mutateRoute(patternBase);
    const invalidConcrete = mutateRoute(concrete);
    const asPattern = ensureDynamicPattern(patternBase, idx);

    if (mod === 0) {
      result.push(`router.route === '${patternBase}'`);
    } else if (mod === 1) {
      result.push(`router.route === '${invalidPattern}'`);
    } else if (mod === 2) {
      result.push(`router.asPath === '${concrete}'`);
    } else if (mod === 3) {
      result.push(`router.asPath === '${asPattern}'`);
    } else if (mod === 4) {
      result.push(`['${patternBase}'].includes(router.route)`);
    } else {
      result.push(`['${invalidConcrete}'].includes(router.asPath)`);
    }
  }

  return result;
}

function buildNavigationLines(count) {
  const result = [];

  for (let i = 0; i < count; i += 1) {
    const idx = i % routesCount;
    const mod = i % 6;
    const fallbackStatic = `/r${idx}`;
    const staticRoute = pickFrom(staticRoutesList, fallbackStatic, idx);
    const patternBase = dynamicPatterns && dynamicPatterns.length
      ? pickFrom(dynamicPatterns, staticRoute, idx)
      : staticRoute;
    const concrete = containsDynamicToken(patternBase)
      ? concreteFromPattern(patternBase, idx)
      : staticRoute;
    const invalidConcrete = mutateRoute(concrete);
    const asPattern = ensureDynamicPattern(patternBase, idx);

    if (mod === 0) {
      result.push(`router.push('${concrete}')`);
    } else if (mod === 1) {
      result.push(`router.replace('${concrete}?ref=1')`);
    } else if (mod === 2) {
      result.push(`router.push('${patternBase}', '${concrete}')`);
    } else if (mod === 3) {
      result.push(
        `router.push({ pathname: '${patternBase}', query: { id: ${idx} } })`
      );
    } else if (mod === 4) {
      result.push(`router.push('${invalidConcrete}')`);
    } else {
      result.push(`router.push('${patternBase}', '${asPattern}')`);
    }
  }

  return result;
}

let lines = [];

if (rulesMode === 'compare') {
  lines = buildCompareLines(statementsCount);
} else if (rulesMode === 'navigation') {
  lines = buildNavigationLines(statementsCount);
} else {
  const navigationCount = Math.round(statementsCount * navigationRatio);
  const compareCount = statementsCount - navigationCount;
  lines = buildCompareLines(compareCount).concat(
    buildNavigationLines(navigationCount)
  );
}

const code = lines.join('\n');

const linter = new Linter({ configType: 'flat' });

const config = [
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    plugins: {
      [PLUGIN_NAME]: {
        rules: {
          'no-invalid-route-compare': compareRule,
          'no-invalid-router-navigation': navigationRule,
        },
      },
    },
    rules: {
      ...(rulesMode === 'compare' || rulesMode === 'mixed'
        ? {
            [RULE_COMPARE]: [
              'warn',
              {
                pagesDir,
                suggestClosestRoute,
              },
            ],
          }
        : {}),
      ...(rulesMode === 'navigation' || rulesMode === 'mixed'
        ? {
            [RULE_NAVIGATION]: [
              'warn',
              {
                pagesDir,
                suggestClosestRoute,
              },
            ],
          }
        : {}),
    },
  },
];

let filePaths = null;

if (mode === 'files') {
  const srcDir = join(tempRoot, 'src');
  mkdirSync(srcDir, { recursive: true });
  filePaths = [];

  const perFile = Math.max(1, Math.ceil(lines.length / filesCount));
  let offset = 0;

  for (let i = 0; i < filesCount; i += 1) {
    const slice = lines.slice(offset, offset + perFile);

    if (slice.length === 0) {
      break;
    }

    const filePath = join(srcDir, `file-${i}.js`);
    writeFileSync(filePath, slice.join('\n'));
    filePaths.push(filePath);
    offset += perFile;
  }
}

function verify(text, filename) {
  const messages = linter.verify(text, config, { filename });
  const failure = messages.find((message) => message.fatal || !message.ruleId);

  if (failure) {
    throw new Error(`Benchmark lint failed: ${failure.message}`);
  }

  return messages;
}

function runOnce() {
  if (mode === 'files') {
    let diagnostics = 0;
    for (const filePath of filePaths) {
      const text = readFileSync(filePath, 'utf8');
      // Flat config matches filenames relative to the linter's working directory.
      diagnostics += verify(text, basename(filePath)).length;
    }
    return diagnostics;
  }

  return verify(code, 'input.js').length;
}

const coldStart = performance.now();
const diagnosticsPerRun = runOnce();
const coldDuration = performance.now() - coldStart;

// Check each enabled rule outside the timed workload, even for all-valid input.
const ruleChecks = verify(
  "router.route === '/__benchmark__?x=1'; router.push('/[__benchmark__]');",
  'benchmark-check.js'
);
for (const ruleId of Object.keys(config[0].rules)) {
  if (!ruleChecks.some((message) => message.ruleId === ruleId)) {
    throw new Error(`Benchmark rule check failed: ${ruleId} did not report`);
  }
}
if (Object.keys(config[0].rules).length === 0) {
  throw new Error('Benchmark rule check failed: no rules enabled');
}

const warmStart = performance.now();
for (let i = 0; i < warmup; i += 1) {
  runOnce();
}
const warmupDuration = performance.now() - warmStart;

const timings = [];
const measuredStart = performance.now();
for (let i = 0; i < iterations; i += 1) {
  const t0 = performance.now();
  runOnce();
  timings.push(performance.now() - t0);
}
const measuredDuration = performance.now() - measuredStart;
const metrics = stats(timings);

const report = {
  routes: pagesDirArg && realRoutesCount !== null ? realRoutesCount : routesCount * 2,
  statements: lines.length,
  mode,
  rules: rulesMode,
  files: mode === 'files' ? filePaths.length : 1,
  navigationRatio: rulesMode === 'mixed' ? navigationRatio : null,
  suggestClosestRoute,
  diagnosticsPerRun,
  coldRunMs: coldDuration,
  warmupRuns: warmup,
  warmupMs: warmupDuration,
  measuredRuns: iterations,
  measuredTotalMs: measuredDuration,
  avgMs: metrics.mean,
  medianMs: metrics.median,
  p95Ms: metrics.p95,
  minMs: metrics.min,
  maxMs: metrics.max,
  node: process.version,
  platform: process.platform,
};

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Benchmark results');
  console.log(`Routes: ${report.routes} (index + dynamic)`);
  console.log(`Statements: ${report.statements}`);
  console.log(`Mode: ${report.mode}`);
  console.log(`Rules: ${report.rules}`);
  if (report.mode === 'files') {
    console.log(`Files: ${report.files}`);
  }
  if (report.rules === 'mixed') {
    console.log(`Navigation ratio: ${report.navigationRatio}`);
  }
  if (pagesDirArg) {
    console.log(`Pages dir: ${pagesDir}`);
  }
  console.log(`Suggest closest: ${report.suggestClosestRoute}`);
  console.log(`Diagnostics per run: ${report.diagnosticsPerRun}`);
  console.log(`Cold run: ${formatMs(report.coldRunMs)}`);
  console.log(`Warmup: ${report.warmupRuns}x -> ${formatMs(report.warmupMs)}`);
  console.log(`Measured: ${report.measuredRuns}x -> ${formatMs(report.measuredTotalMs)}`);
  console.log(`Avg: ${formatMs(report.avgMs)} | Median: ${formatMs(report.medianMs)} | P95: ${formatMs(report.p95Ms)}`);
  console.log(`Min: ${formatMs(report.minMs)} | Max: ${formatMs(report.maxMs)}`);
}
