const {
  containsDynamicToken,
  normalizeTrailingSlash,
  matchesAnyRoutePattern,
  findMatchingPattern,
  findClosestRoute,
} = require('./routes');

function evaluateRoutePattern(
  rawValue,
  {
    routeSet,
    dynamicMatchers,
    allRoutesList,
    suggestClosestRoute,
    allowDynamicSuggestion = false,
    disallowQueryHash = false,
  }
) {
  if (!rawValue || !rawValue.startsWith('/')) {
    return { status: 'skip' };
  }

  if (disallowQueryHash && (rawValue.includes('?') || rawValue.includes('#'))) {
    return { status: 'queryhash' };
  }

  const normalized = normalizeTrailingSlash(rawValue);

  if (routeSet.has(normalized)) {
    return { status: 'ok', normalized };
  }

  let suggestion = null;

  if (suggestClosestRoute) {
    if (allowDynamicSuggestion) {
      suggestion = findMatchingPattern(normalized, dynamicMatchers);
    }

    if (!suggestion) {
      suggestion = findClosestRoute(normalized, allRoutesList);
    }
  }

  return { status: 'unknown', normalized, suggestion };
}

function evaluateConcretePath(
  rawValue,
  {
    normalizeAsPathValue,
    warnOnUnknownPaths,
    staticRoutes,
    dynamicMatchers,
    staticRoutesList,
    suggestClosestRoute,
  }
) {
  if (!rawValue || !rawValue.startsWith('/')) {
    return { status: 'skip' };
  }

  const normalized = normalizeAsPathValue(rawValue);

  if (matchesAnyRoutePattern(normalized, staticRoutes, dynamicMatchers)) {
    return { status: 'ok', normalized };
  }

  if (!warnOnUnknownPaths) {
    return { status: 'ok', normalized };
  }

  const suggestion = suggestClosestRoute
    ? findClosestRoute(normalized, staticRoutesList)
    : null;

  return { status: 'unknown', normalized, suggestion };
}

module.exports = {
  evaluateRoutePattern,
  evaluateConcretePath,
};
