const { containsDynamicToken, normalizeTrailingSlash } = require('./routes');
const { evaluateRoutePattern, evaluateConcretePath } = require('./routeEvaluation');
const { reportRouteEvaluation } = require('./reporting');
const { buildUrlObjectDesc } = require('./suggestions');

function isValidIdentifier(value) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function escapeSingle(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function extractUrlObject(pattern, asValue, normalizeAsPathValue) {
  if (!pattern || !asValue) {
    return null;
  }

  if (pattern.includes('?') || pattern.includes('#')) {
    return null;
  }

  if (asValue.includes('?') || asValue.includes('#')) {
    return null;
  }

  const normalizedPattern = normalizeTrailingSlash(pattern);
  const normalizedAs = normalizeTrailingSlash(normalizeAsPathValue(asValue));

  const patternSegments = normalizedPattern.split('/').filter(Boolean);
  const asSegments = normalizedAs.split('/').filter(Boolean);

  if (patternSegments.length !== asSegments.length) {
    return null;
  }

  const params = {};
  let hasParams = false;

  for (let i = 0; i < patternSegments.length; i += 1) {
    const segment = patternSegments[i];
    const asSegment = asSegments[i];

    if (/^\[\[\.\.\..+\]\]$/.test(segment) || /^\[\.\.\..+\]$/.test(segment)) {
      return null;
    }

    const match = /^\[([^\]]+)\]$/.exec(segment);

    if (match) {
      const name = match[1];

      if (name.startsWith('...')) {
        return null;
      }

      params[name] = asSegment;
      hasParams = true;
      continue;
    }

    if (segment !== asSegment) {
      return null;
    }
  }

  if (!hasParams) {
    return null;
  }

  return { pathname: normalizedPattern, params };
}

function buildUrlObjectSuggestion(pattern, params) {
  const entries = Object.entries(params || {});

  if (entries.length === 0) {
    return null;
  }

  const queryText = entries
    .map(([key, value]) => {
      const safeKey = isValidIdentifier(key) ? key : `'${escapeSingle(key)}'`;
      return `${safeKey}: '${escapeSingle(value)}'`;
    })
    .join(', ');

  return `{ pathname: '${escapeSingle(pattern)}', query: { ${queryText} } }`;
}

function isJsxAttributeValueNode(node) {
  return (
    node &&
    node.parent &&
    (node.parent.type === 'JSXAttribute' ||
      node.parent.type === 'JSXExpressionContainer')
  );
}

function buildPreferUrlObjectText(urlNode, asNode, suggestionText) {
  if (!suggestionText) {
    return null;
  }

  const urlIsJsxValue = isJsxAttributeValueNode(urlNode);
  const asIsJsxValue = isJsxAttributeValueNode(asNode);

  if (!urlIsJsxValue && !asIsJsxValue) {
    return suggestionText;
  }

  const open = urlIsJsxValue && urlNode.parent.type === 'JSXExpressionContainer' ? '{' : '{{';
  const close = asIsJsxValue && asNode.parent.type === 'JSXExpressionContainer' ? '}' : '}}';

  return `${open}${suggestionText.slice(1, -1)}${close}`;
}

const SPECIAL_NAVIGATION_PATHS = new Set(['/404', '/500']);

function isSpecialNavigationPath(value, normalizeAsPathValue, normalizedValue) {
  if (!value) {
    return false;
  }

  const normalized =
    typeof normalizedValue === 'string'
      ? normalizeTrailingSlash(normalizedValue)
      : normalizeTrailingSlash(normalizeAsPathValue(value));
  return SPECIAL_NAVIGATION_PATHS.has(normalized);
}

function createNavigationReporter(context, ruleContext, options = {}) {
  const {
    routeSet,
    dynamicMatchers,
    dynamicMatcherIndex,
    allRoutesList,
    staticRoutes,
    staticRoutesList,
    normalizeAsPathValue,
    routeCacheEntry,
    routeEvaluationKey,
    suggestClosestRoute,
    warnOnUnknownPaths,
  } = ruleContext;

  const preferUrlObject = options.preferUrlObject === true;
  const messages = options.messages || {};
  const routePatternCache = new Map();
  const concretePathCache = new Map();
  const candidateCache = new Map();
  function getNavigationCandidate(rawValue) {
    if (!rawValue) {
      return null;
    }

    const cachedCandidate = candidateCache.get(rawValue);

    if (cachedCandidate) {
      return cachedCandidate;
    }

    const candidate = {
      rawValue,
      startsWithSlash: rawValue.startsWith('/'),
      hasQueryHash: rawValue.includes('?') || rawValue.includes('#'),
      hasDynamicToken: containsDynamicToken(rawValue),
    };

    candidate.normalized = candidate.startsWithSlash
      ? normalizeAsPathValue(rawValue)
      : null;

    candidateCache.set(rawValue, candidate);
    return candidate;
  }
  function getCacheKey(rawValue, a, b, c) {
    return `${rawValue}\u0000${a ? 1 : 0}\u0000${b ? 1 : 0}\u0000${c ? 1 : 0}`;
  }

  function getCachedRoutePattern(rawValue, allowDynamicSuggestion, disallowQueryHash) {
    const cacheKey = getCacheKey(
      rawValue,
      allowDynamicSuggestion,
      disallowQueryHash,
      suggestClosestRoute
    );

    if (routePatternCache.has(cacheKey)) {
      return routePatternCache.get(cacheKey);
    }

    const result = evaluateRoutePattern(rawValue, {
      routeSet,
      dynamicMatchers,
      dynamicMatcherIndex,
      allRoutesList,
      cacheEntry: routeCacheEntry,
      routeEvaluationKey,
      suggestClosestRoute,
      allowDynamicSuggestion,
      disallowQueryHash,
    });

    routePatternCache.set(cacheKey, result);
    return result;
  }

  function getCachedConcretePath(rawValue) {
    const cacheKey = getCacheKey(
      rawValue,
      warnOnUnknownPaths,
      suggestClosestRoute,
      false
    );

    if (concretePathCache.has(cacheKey)) {
      return concretePathCache.get(cacheKey);
    }

    const result = evaluateConcretePath(rawValue, {
      normalizeAsPathValue,
      warnOnUnknownPaths,
      staticRoutes,
      dynamicMatchers,
      dynamicMatcherIndex,
      staticRoutesList,
      suggestClosestRoute,
      cacheEntry: routeCacheEntry,
      routeEvaluationKey,
    });

    concretePathCache.set(cacheKey, result);
    return result;
  }

  function reportStringTarget({ node, rawValue, method, hasAs }) {
    const candidate = getNavigationCandidate(rawValue);

    if (!candidate || !candidate.startsWithSlash) {
      return;
    }

    if (candidate.hasDynamicToken) {
      const result = getCachedRoutePattern(rawValue, false, false);

      const reported = reportRouteEvaluation(
        context,
        node,
        result,
        { unknown: messages.patternUnknown },
        { method, value: rawValue }
      );

      if (!reported && result.status === 'ok' && !hasAs) {
        context.report({
          node,
          messageId: messages.patternWithoutAs,
          data: { method, value: rawValue },
        });
      }

      return;
    }

    if (
      isSpecialNavigationPath(
        rawValue,
        normalizeAsPathValue,
        candidate.normalized
      )
    ) {
      return;
    }

    const concreteResult = getCachedConcretePath(rawValue);

    reportRouteEvaluation(
      context,
      node,
      concreteResult,
      { unknown: messages.unknown },
      { method, value: rawValue }
    );
  }

  function reportPathname({ node, rawValue, method }) {
    const candidate = getNavigationCandidate(rawValue);

    if (!candidate || !candidate.startsWithSlash) {
      return;
    }

    if (candidate.hasQueryHash) {
      reportRouteEvaluation(
        context,
        node,
        { status: 'queryhash' },
        { queryhash: messages.queryhash },
        { method, value: rawValue }
      );
      return;
    }

    if (candidate.hasDynamicToken) {
      const result = getCachedRoutePattern(rawValue, true, false);

      reportRouteEvaluation(
        context,
        node,
        result,
        {
          unknown: messages.pathnameUnknown,
        },
        { method, value: rawValue }
      );

      return;
    }

    if (
      isSpecialNavigationPath(
        rawValue,
        normalizeAsPathValue,
        candidate.normalized
      )
    ) {
      return;
    }

    const concreteResult = getCachedConcretePath(rawValue);

    reportRouteEvaluation(
      context,
      node,
      concreteResult,
      { unknown: messages.pathnameUnknown },
      { method, value: rawValue }
    );
  }

  function reportAsTarget({ node, rawValue, method }) {
    const candidate = getNavigationCandidate(rawValue);

    if (!candidate || !candidate.startsWithSlash) {
      return;
    }

    if (candidate.hasDynamicToken) {
      context.report({
        node,
        messageId: messages.asWithPattern,
        data: { method, value: rawValue },
      });
      return;
    }

    const result = getCachedConcretePath(rawValue);

    reportRouteEvaluation(
      context,
      node,
      result,
      {
        pattern: messages.asWithPattern,
        unknown: messages.asUnknown,
      },
      { method, value: rawValue }
    );
  }

  function reportPreferUrlObject({
    urlNode,
    urlValue,
    asNode,
    asValue,
    method,
  }) {
    if (!preferUrlObject) {
      return;
    }

    const urlCandidate = getNavigationCandidate(urlValue);
    const asCandidate = getNavigationCandidate(asValue);

    if (!urlCandidate || !asCandidate) {
      return;
    }

    if (!urlCandidate.startsWithSlash || !asCandidate.startsWithSlash) {
      return;
    }

    if (!urlCandidate.hasDynamicToken) {
      return;
    }

    if (asCandidate.hasDynamicToken) {
      return;
    }

    const patternResult = getCachedRoutePattern(urlValue, false, false);

    if (patternResult.status !== 'ok') {
      return;
    }

    const asResult = getCachedConcretePath(asValue);

    if (warnOnUnknownPaths && asResult.status !== 'ok') {
      return;
    }

    const urlObject = extractUrlObject(urlValue, asValue, normalizeAsPathValue);
    const suggestionText = urlObject
      ? buildUrlObjectSuggestion(urlObject.pathname, urlObject.params)
      : null;
    const preferUrlObjectText = buildPreferUrlObjectText(
      urlNode,
      asNode,
      suggestionText
    );

    context.report({
      node: urlNode,
      messageId: messages.preferUrlObject,
      data: { method },
      suggest: preferUrlObjectText
        ? [
            {
              desc: buildUrlObjectDesc(),
              fix(fixer) {
                if (!urlNode.range || !asNode.range) {
                  return null;
                }

                return fixer.replaceTextRange(
                  [urlNode.range[0], asNode.range[1]],
                  preferUrlObjectText
                );
              },
            },
          ]
        : undefined,
    });
  }

  return {
    reportStringTarget,
    reportPathname,
    reportAsTarget,
    reportPreferUrlObject,
  };
}

module.exports = {
  buildUrlObjectSuggestion,
  createNavigationReporter,
  extractUrlObject,
  isSpecialNavigationPath,
};
