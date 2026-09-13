const { getStaticStringValue } = require('./ast');

function createStaticIdentifierResolver(sourceCode) {
  const identifierToVariable = new WeakMap();
  const variableCache = new WeakMap();
  const resolvingVariables = new Set();
  let isIndexed = false;

  function indexVariables() {
    if (isIndexed) {
      return;
    }

    isIndexed = true;

    const scopes =
      sourceCode && sourceCode.scopeManager && sourceCode.scopeManager.scopes
        ? sourceCode.scopeManager.scopes
        : null;

    if (!Array.isArray(scopes)) {
      return;
    }

    for (const scope of scopes) {
      if (!scope || !Array.isArray(scope.variables)) {
        continue;
      }

      for (const variable of scope.variables) {
        if (!variable || !Array.isArray(variable.references)) {
          continue;
        }

        for (const reference of variable.references) {
          if (reference && reference.identifier) {
            identifierToVariable.set(reference.identifier, variable);
          }
        }
      }
    }
  }

  function resolveVariable(variable) {
    if (variableCache.has(variable)) {
      return variableCache.get(variable);
    }

    const variableDef =
      variable && Array.isArray(variable.defs) && variable.defs.length === 1
        ? variable.defs[0]
        : null;

    if (
      !variableDef ||
      !variableDef.node ||
      !variableDef.node.id ||
      variableDef.node.id.type !== 'Identifier' ||
      variableDef.type !== 'Variable' ||
      !variableDef.parent ||
      variableDef.parent.kind !== 'const' ||
      !variableDef.node.init ||
      resolvingVariables.has(variable)
    ) {
      variableCache.set(variable, null);
      return null;
    }

    resolvingVariables.add(variable);

    try {
      const resolvedValue = getStaticStringValue(
        variableDef.node.init,
        resolveIdentifier
      );
      variableCache.set(variable, resolvedValue);
      return resolvedValue;
    } finally {
      resolvingVariables.delete(variable);
    }
  }

  function resolveIdentifier(node) {
    if (!node || node.type !== 'Identifier') {
      return null;
    }

    indexVariables();

    if (!identifierToVariable.has(node)) {
      return null;
    }

    return resolveVariable(identifierToVariable.get(node));
  }

  return resolveIdentifier;
}

module.exports = {
  createStaticIdentifierResolver,
};
