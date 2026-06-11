const path = require('path');
const { loadNextConfigSync } = require('./nextConfig');
const {
  stripQueryAndHash,
  normalizeTrailingSlash,
  stripBasePath,
  stripLocale,
} = require('./routes');
const {
  getPagesDirAbs,
  getRouteMatchers,
  ensureRouteLists,
} = require('./routeData');

function splitRouterObjects(routerObjects) {
  const names = [];
  const paths = [];

  if (Array.isArray(routerObjects)) {
    for (const entry of routerObjects) {
      if (typeof entry !== 'string' || !entry) {
        continue;
      }
      if (entry.includes('.')) {
        paths.push(entry);
      } else {
        names.push(entry);
      }
    }
  } else {
    names.push('router');
    names.push('Router');
  }

  return { routerObjectNames: names, routerObjectPaths: paths };
}

function normalizeStringArray(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const result = [];
  const seen = new Set();

  for (const entry of value) {
    if (typeof entry !== 'string' || !entry) {
      continue;
    }
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    result.push(entry);
  }

  return result;
}

function normalizeRouteProperties(value) {
  return normalizeStringArray(value, ['route', 'pathname']);
}

function createRuleContext(context, options) {
  const cwd = context.getCwd ? context.getCwd() : process.cwd();
  const pagesDir = options.pagesDir || 'pages';
  const normalizeAsPathCache = new Map();
  const hasBasePath = Object.prototype.hasOwnProperty.call(options, 'basePath');
  const hasLocales = Object.prototype.hasOwnProperty.call(options, 'locales');
  const readNextConfig = options.readNextConfig === true;
  const nextConfigPath = options.nextConfigPath || '';
  const pagesDirAbs = getPagesDirAbs(pagesDir, cwd);
  const configRoot = path.dirname(pagesDirAbs);
  const nextConfig = readNextConfig
    ? loadNextConfigSync({ cwd: configRoot, configPath: nextConfigPath })
    : null;
  const basePath = hasBasePath
    ? options.basePath || ''
    : (nextConfig && nextConfig.basePath) || '';
  const locales = hasLocales
    ? options.locales || []
    : (nextConfig &&
        nextConfig.i18n &&
        Array.isArray(nextConfig.i18n.locales) &&
        nextConfig.i18n.locales) ||
      [];

  const { routerObjectNames, routerObjectPaths } = splitRouterObjects(
    options.routerObjects
  );

  const warnOnUnknownPaths = options.warnOnUnknownPaths !== false;
  const skipIfPagesDirMissing = options.skipIfPagesDirMissing !== false;
  const isVsCode =
    process.env.VSCODE_PID ||
    process.env.VSCODE_CWD ||
    process.env.TERM_PROGRAM === 'vscode';
  const suggestClosestRoute =
    options.suggestClosestRoute === undefined
      ? Boolean(isVsCode)
      : options.suggestClosestRoute;

  const includeDynamicMatchers = warnOnUnknownPaths || suggestClosestRoute;
  const routeData = getRouteMatchers({
    pagesDir,
    cwd,
    includeDynamicMatchers,
  });
  const normalizeAsPathKey = `${basePath || ''}\u0000${(locales || []).join('\u0001')}`;
  const routeEvaluationKey = `${normalizeAsPathKey}\u0000${warnOnUnknownPaths ? 1 : 0}\u0000${suggestClosestRoute ? 1 : 0}`;

  if (skipIfPagesDirMissing && !routeData.pagesDirExists) {
    return null;
  }

  let staticRoutesList = null;
  let allRoutesList = null;

  if (suggestClosestRoute) {
    ensureRouteLists(routeData.cacheEntry);
    staticRoutesList = routeData.cacheEntry.staticRoutesList;
    allRoutesList = routeData.cacheEntry.allRoutesList;
  }

  function normalizeAsPathValue(rawValue) {
    if (normalizeAsPathCache.has(rawValue)) {
      return normalizeAsPathCache.get(rawValue);
    }

    const stripped = stripQueryAndHash(rawValue);
    let normalized = normalizeTrailingSlash(stripped);

    normalized = stripBasePath(normalized, basePath);
    normalized = stripLocale(normalized, locales);

    const result = normalizeTrailingSlash(normalized);
    normalizeAsPathCache.set(rawValue, result);
    return result;
  }

  return {
    pagesDir,
    basePath,
    locales,
    routerObjectNames,
    routerObjectPaths,
    warnOnUnknownPaths,
    suggestClosestRoute,
    routeSet: routeData.routeSet,
    staticRoutes: routeData.staticRoutes,
    dynamicMatchers: routeData.dynamicMatchers,
    dynamicMatcherIndex: routeData.dynamicMatcherIndex,
    routeCacheEntry: routeData.cacheEntry,
    routeEvaluationKey,
    normalizeAsPathKey,
    staticRoutesList,
    allRoutesList,
    normalizeAsPathValue,
  };
}

module.exports = {
  createRuleContext,
  normalizeRouteProperties,
};
