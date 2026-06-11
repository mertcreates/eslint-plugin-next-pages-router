function stripQueryAndHash(p) {
  const q = p.indexOf('?');
  const h = p.indexOf('#');
  const cut = Math.min(q === -1 ? Infinity : q, h === -1 ? Infinity : h);

  return cut === Infinity ? p : p.slice(0, cut);
}

function containsDynamicToken(pathStr) {
  return pathStr.includes('[') && pathStr.includes(']');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTrailingSlash(p) {
  if (!p) {
    return p;
  }
  if (p === '/') {
    return '/';
  }

  return p.endsWith('/') ? p.slice(0, -1) : p;
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') {
    return '';
  }

  let normalized = basePath.startsWith('/') ? basePath : '/' + basePath;
  normalized = normalizeTrailingSlash(normalized);

  return normalized === '/' ? '' : normalized;
}

function stripBasePath(pathname, basePath) {
  const normalizedBase = normalizeBasePath(basePath);

  if (!normalizedBase) {
    return pathname;
  }
  if (pathname === normalizedBase) {
    return '/';
  }
  if (pathname.startsWith(normalizedBase + '/')) {
    return pathname.slice(normalizedBase.length) || '/';
  }

  return pathname;
}

function stripLocale(pathname, locales) {
  if (!Array.isArray(locales) || locales.length === 0) {
    return pathname;
  }
  if (pathname === '/') {
    return pathname;
  }

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return pathname;
  }

  if (!locales.includes(segments[0])) {
    return pathname;
  }

  const remaining = segments.slice(1).join('/');

  return remaining ? '/' + remaining : '/';
}

function patternToRegex(pattern) {
  if (pattern === '/') {
    return /^\/$/;
  }

  const segments = pattern
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      if (/^\[\[\.\.\..+\]\]$/.test(seg)) {
        return '(?:/.*)?';
      }

      if (/^\[\.\.\..+\]$/.test(seg)) {
        return '/.+';
      }

      if (/^\[.+\]$/.test(seg)) {
        return '/[^/]+';
      }

      return '/' + escapeRegex(seg);
    });

  return new RegExp('^' + segments.join('') + '$');
}

function getMatcherIndexKey(firstSegment, segmentCount) {
  return `${firstSegment}\u0000${segmentCount}`;
}

function getMatcherSegments(pattern) {
  return pattern.split('/').filter(Boolean);
}

function buildDynamicMatcherIndex(dynamicMatchers) {
  const exactByKey = new Map();
  const catchAllByFirstSegment = new Map();
  const fallback = [];

  for (const [index, matcher] of (dynamicMatchers || []).entries()) {
    if (!matcher || !matcher.pattern) {
      continue;
    }

    if (typeof matcher.order !== 'number') {
      matcher.order = index;
    }

    const segments = getMatcherSegments(matcher.pattern);
    const firstSegment = segments[0];
    const hasCatchAll = segments.some((segment) =>
      /^\[\[?\.\.\..+\]\]?$/.test(segment)
    );

    if (!firstSegment || /^\[.+\]$/.test(firstSegment)) {
      fallback.push(matcher);
      continue;
    }

    if (hasCatchAll) {
      let bucket = catchAllByFirstSegment.get(firstSegment);

      if (!bucket) {
        bucket = [];
        catchAllByFirstSegment.set(firstSegment, bucket);
      }

      bucket.push(matcher);
      continue;
    }

    const key = getMatcherIndexKey(firstSegment, segments.length);
    let bucket = exactByKey.get(key);

    if (!bucket) {
      bucket = [];
      exactByKey.set(key, bucket);
    }

    bucket.push(matcher);
  }

  return {
    exactByKey,
    catchAllByFirstSegment,
    fallback,
  };
}

function getIndexedDynamicMatchers(concretePath, dynamicMatchers) {
  if (!dynamicMatchers) {
    return [];
  }

  if (Array.isArray(dynamicMatchers)) {
    return dynamicMatchers;
  }

  const segments = concretePath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return dynamicMatchers.fallback || [];
  }

  const firstSegment = segments[0];
  const exactBucket = dynamicMatchers.exactByKey.get(
    getMatcherIndexKey(firstSegment, segments.length)
  );
  const catchAllBucket =
    dynamicMatchers.catchAllByFirstSegment.get(firstSegment) || [];
  const fallback = dynamicMatchers.fallback || [];

  if (!exactBucket || exactBucket.length === 0) {
    if (catchAllBucket.length === 0) {
      return fallback;
    }

    const merged = catchAllBucket.concat(fallback);
    return merged.length > 1 ? merged.sort((a, b) => a.order - b.order) : merged;
  }

  if (catchAllBucket.length === 0 && fallback.length === 0) {
    return exactBucket;
  }

  const merged = exactBucket.concat(catchAllBucket, fallback);
  return merged.length > 1 ? merged.sort((a, b) => a.order - b.order) : merged;
}

function matchesAnyRoutePattern(concretePath, staticRoutes, dynamicMatchers) {
  if (staticRoutes.has(concretePath)) {
    return true;
  }

  if (!dynamicMatchers) {
    return false;
  }

  for (const matcher of getIndexedDynamicMatchers(concretePath, dynamicMatchers)) {
    if (matcher.regex.test(concretePath)) {
      return true;
    }
  }

  return false;
}

function findMatchingPattern(concretePath, dynamicMatchers) {
  if (!dynamicMatchers) {
    return null;
  }

  for (const matcher of getIndexedDynamicMatchers(concretePath, dynamicMatchers)) {
    if (matcher.regex.test(concretePath)) {
      return matcher.pattern;
    }
  }

  return null;
}

function levenshteinBounded(a, b, maxDistance) {
  const aLen = a.length;
  const bLen = b.length;
  const lenDiff = Math.abs(aLen - bLen);

  if (lenDiff > maxDistance) {
    return maxDistance + 1;
  }
  const dp = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j += 1) {
    dp[j] = j;
  }

  for (let i = 1; i <= aLen; i += 1) {
    let prev = dp[0];

    dp[0] = i;
    let rowMin = dp[0];

    for (let j = 1; j <= bLen; j += 1) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;

      if (dp[j] < rowMin) {
        rowMin = dp[j];
      }
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }
  }

  return dp[bLen];
}

function findClosestRoute(value, routes, excludeSet) {
  if (!routes || routes.length === 0) {
    return null;
  }

  let best = null;
  const maxDistance = Math.max(3, Math.floor(value.length * 0.3));
  let bestDistance = maxDistance + 1;

  for (const route of routes) {
    if (excludeSet && excludeSet.has(route)) {
      continue;
    }
    if (Math.abs(value.length - route.length) > maxDistance) {
      continue;
    }

    const limit = Math.min(maxDistance, bestDistance - 1);
    const dist = levenshteinBounded(value, route, limit);

    if (dist < bestDistance) {
      bestDistance = dist;
      best = route;

      if (bestDistance === 0) {
        break;
      }
    }
  }

  return bestDistance <= maxDistance ? best : null;
}

module.exports = {
  stripQueryAndHash,
  containsDynamicToken,
  normalizeTrailingSlash,
  normalizeBasePath,
  stripBasePath,
  stripLocale,
  patternToRegex,
  buildDynamicMatcherIndex,
  matchesAnyRoutePattern,
  findMatchingPattern,
  findClosestRoute,
};
