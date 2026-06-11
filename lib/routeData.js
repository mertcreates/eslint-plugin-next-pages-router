const { existsSync, statSync } = require('fs');
const { isAbsolute, join } = require('path');
const pagesManifest = require('./pagesManifest');
const {
  normalizeTrailingSlash,
  containsDynamicToken,
  patternToRegex,
  buildDynamicMatcherIndex,
} = require('./routes');

const { buildPagesRouteStateSync } = pagesManifest;

const routeCache = new Map();

function createEmptyRouteCacheEntry() {
  return {
    routeSet: new Set(),
    staticRoutes: new Set(),
    dynamicPatterns: [],
    dynamicMatchers: null,
    dynamicMatcherIndex: null,
    staticRoutesList: null,
    allRoutesList: null,
    pagesDirExists: false,
    watchedDirs: new Set(),
    watchedDirMtimes: new Map(),
  };
}

function createFileSystemOps(fsOps) {
  return {
    existsSync: fsOps && typeof fsOps.existsSync === 'function' ? fsOps.existsSync : existsSync,
    statSync: fsOps && typeof fsOps.statSync === 'function' ? fsOps.statSync : statSync,
  };
}

function collectWatchedDirMtimes(watchedDirs, fileSystemOps) {
  const watchedDirMtimes = new Map();

  for (const dirAbs of watchedDirs) {
    watchedDirMtimes.set(dirAbs, fileSystemOps.statSync(dirAbs).mtimeMs);
  }

  return watchedDirMtimes;
}

function isTransientRouteCacheError(error) {
  return (
    error &&
    (error.code === 'ENOENT' ||
      error.code === 'ENOTDIR' ||
      error.code === 'EBUSY')
  );
}

function getPagesDirAbs(pagesDir, cwd) {
  return isAbsolute(pagesDir) ? pagesDir : join(cwd, pagesDir);
}

function buildRouteCacheEntryOnce({ pagesDir, cwd, fsOps }) {
  const fileSystemOps = createFileSystemOps(fsOps);
  const pagesAbs = getPagesDirAbs(pagesDir, cwd);

  if (!fileSystemOps.existsSync(pagesAbs)) {
    return createEmptyRouteCacheEntry();
  }

  const { routeSet: rawRouteSet, watchedDirs } = buildPagesRouteStateSync({
    pagesDir,
    cwd,
  });
  const routeSet = new Set();
  const staticRoutes = new Set();
  const dynamicPatterns = [];

  for (const route of rawRouteSet) {
    const normalized = normalizeTrailingSlash(route);

    routeSet.add(normalized);

    if (containsDynamicToken(normalized)) {
      dynamicPatterns.push(normalized);
    } else {
      staticRoutes.add(normalized);
    }
  }

  return {
    routeSet,
    staticRoutes,
    dynamicPatterns,
    dynamicMatchers: null,
    dynamicMatcherIndex: null,
    staticRoutesList: null,
    allRoutesList: null,
    pagesDirExists: true,
    watchedDirs,
    watchedDirMtimes: collectWatchedDirMtimes(watchedDirs, fileSystemOps),
  };
}

function buildRouteCacheEntry({ pagesDir, cwd, fsOps }) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return buildRouteCacheEntryOnce({ pagesDir, cwd, fsOps });
    } catch (error) {
      lastError = error;

      if (!isTransientRouteCacheError(error) || attempt === 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

function isRouteCacheStale(pagesAbs, cached, fileSystemOps) {
  const pagesDirExists = fileSystemOps.existsSync(pagesAbs);

  if (pagesDirExists !== cached.pagesDirExists) {
    return true;
  }

  if (!pagesDirExists) {
    return false;
  }

  for (const dirAbs of cached.watchedDirs) {
    const cachedMtime = cached.watchedDirMtimes.get(dirAbs);

    if (cachedMtime === undefined) {
      return true;
    }

    try {
      if (fileSystemOps.statSync(dirAbs).mtimeMs !== cachedMtime) {
        return true;
      }
    } catch {
      return true;
    }
  }

  return false;
}

function ensureDynamicMatchers(cached) {
  if (!cached.dynamicMatchers) {
    cached.dynamicMatchers = cached.dynamicPatterns.map((pattern) => ({
      pattern,
      regex: patternToRegex(pattern),
    }));
    cached.dynamicMatcherIndex = buildDynamicMatcherIndex(cached.dynamicMatchers);
  } else if (!cached.dynamicMatcherIndex) {
    cached.dynamicMatcherIndex = buildDynamicMatcherIndex(cached.dynamicMatchers);
  }

  return cached.dynamicMatchers;
}

function getRouteMatchers({
  pagesDir,
  cwd,
  includeDynamicMatchers = true,
  fsOps,
}) {
  const pagesAbs = getPagesDirAbs(pagesDir, cwd);
  const fileSystemOps = createFileSystemOps(fsOps);
  let cached = routeCache.get(pagesAbs);

  if (!cached || isRouteCacheStale(pagesAbs, cached, fileSystemOps)) {
    cached = buildRouteCacheEntry({ pagesDir, cwd, fsOps: fileSystemOps });
    routeCache.set(pagesAbs, cached);
  }

  let dynamicMatchers = null;

  if (includeDynamicMatchers) {
    dynamicMatchers = ensureDynamicMatchers(cached);
  }

  return {
    routeSet: cached.routeSet,
    staticRoutes: cached.staticRoutes,
    dynamicMatchers,
    dynamicMatcherIndex: includeDynamicMatchers ? cached.dynamicMatcherIndex : null,
    cacheEntry: cached,
    pagesDirExists: cached.pagesDirExists,
  };
}

function ensureRouteLists(cacheEntry) {
  if (!cacheEntry.staticRoutesList) {
    cacheEntry.staticRoutesList = Array.from(cacheEntry.staticRoutes);
  }
  if (!cacheEntry.allRoutesList) {
    cacheEntry.allRoutesList = Array.from(cacheEntry.routeSet);
  }
}

module.exports = {
  getPagesDirAbs,
  getRouteMatchers,
  ensureRouteLists,
};
