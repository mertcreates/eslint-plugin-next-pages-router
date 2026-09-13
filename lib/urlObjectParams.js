const {
  getStaticStringValue,
  readObjectProperty,
} = require('./ast');
const { getDynamicRouteParameters } = require('./routes');

function createResult({
  pathnameNode = null,
  pathnameValue = null,
  queryNode = null,
  status,
  missingParams = [],
}) {
  return {
    pathnameNode,
    pathnameValue,
    queryNode,
    status,
    missingParams,
  };
}

function evaluateUrlObjectQueryParams({
  urlObjectNode,
  resolveIdentifierValue,
}) {
  const pathnameProperty = readObjectProperty(urlObjectNode, 'pathname');

  if (pathnameProperty.status !== 'known') {
    return createResult({ status: 'unknown' });
  }

  const pathnameNode = pathnameProperty.node;
  const pathnameValue = getStaticStringValue(
    pathnameNode,
    resolveIdentifierValue
  );

  if (typeof pathnameValue !== 'string') {
    return createResult({ pathnameNode, status: 'unknown' });
  }

  const requiredParams = getDynamicRouteParameters(pathnameValue)
    .filter((parameter) => !parameter.optional)
    .map((parameter) => parameter.name);

  if (requiredParams.length === 0) {
    return createResult({
      pathnameNode,
      pathnameValue,
      status: 'not-required',
    });
  }

  const queryProperty = readObjectProperty(urlObjectNode, 'query');

  if (queryProperty.status === 'unknown') {
    return createResult({
      pathnameNode,
      pathnameValue,
      status: 'unknown',
    });
  }

  if (queryProperty.status === 'missing') {
    return createResult({
      pathnameNode,
      pathnameValue,
      status: 'missing',
      missingParams: requiredParams,
    });
  }

  const queryNode = queryProperty.node;

  if (!queryNode || queryNode.type !== 'ObjectExpression') {
    return createResult({
      pathnameNode,
      pathnameValue,
      queryNode,
      status: 'unknown',
    });
  }

  const missingParams = [];

  for (const parameterName of requiredParams) {
    const parameterProperty = readObjectProperty(queryNode, parameterName);

    if (parameterProperty.status === 'unknown') {
      return createResult({
        pathnameNode,
        pathnameValue,
        queryNode,
        status: 'unknown',
      });
    }

    if (parameterProperty.status === 'missing') {
      missingParams.push(parameterName);
    }
  }

  return createResult({
    pathnameNode,
    pathnameValue,
    queryNode,
    status: missingParams.length === 0 ? 'complete' : 'missing',
    missingParams,
  });
}

module.exports = {
  evaluateUrlObjectQueryParams,
};
