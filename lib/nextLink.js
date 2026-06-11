const {
  getScopeVariable,
  isImportedBindingFromSource,
} = require('./ast');

function collectNextLinkLocalNames(node, linkNames) {
  if (!node || node.type !== 'ImportDeclaration') {
    return;
  }

  if (!node.source || node.source.value !== 'next/link') {
    return;
  }

  for (const specifier of node.specifiers || []) {
    if (specifier.type === 'ImportDefaultSpecifier') {
      linkNames.add(specifier.local.name);
      continue;
    }

    if (
      specifier.type === 'ImportSpecifier' &&
      specifier.imported &&
      specifier.imported.type === 'Identifier' &&
      specifier.imported.name === 'default'
    ) {
      linkNames.add(specifier.local.name);
    }
  }
}

function isNextLinkOpeningElement(node, linkNames, getScope) {
  if (
    !node ||
    node.type !== 'JSXOpeningElement' ||
    !node.name ||
    node.name.type !== 'JSXIdentifier' ||
    !linkNames.has(node.name.name)
  ) {
    return false;
  }

  if (typeof getScope !== 'function') {
    return true;
  }

  const scope = getScope(node);

  if (!scope) {
    return false;
  }

  return isImportedBindingFromSource(
    getScopeVariable(scope, node.name.name),
    'next/link'
  );
}

module.exports = {
  collectNextLinkLocalNames,
  isNextLinkOpeningElement,
};
