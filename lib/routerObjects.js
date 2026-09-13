const {
  getMemberExpressionPath,
  getScopeVariable,
  isImportedBindingFromSource,
  unwrapChain,
} = require('./ast');

function getVariableAtNode(node, getScope) {
  if (
    !node ||
    node.type !== 'Identifier' ||
    typeof getScope !== 'function'
  ) {
    return null;
  }

  let scope = null;

  try {
    scope = getScope(node);
  } catch (_error) {
    return null;
  }

  return scope ? getScopeVariable(scope, node.name) : null;
}

function getSingleImportDefinition(variable) {
  if (
    !variable ||
    !Array.isArray(variable.defs) ||
    variable.defs.length !== 1 ||
    !variable.defs[0] ||
    variable.defs[0].type !== 'ImportBinding'
  ) {
    return null;
  }

  return variable.defs[0];
}

function isNextRouterDefaultBinding(variable) {
  const definition = getSingleImportDefinition(variable);
  const specifier = definition && definition.node;
  const isDefaultSpecifier =
    specifier && specifier.type === 'ImportDefaultSpecifier';
  const isDefaultImportSpecifier =
    specifier &&
    specifier.type === 'ImportSpecifier' &&
    specifier.imported &&
    specifier.imported.type === 'Identifier' &&
    specifier.imported.name === 'default';

  return Boolean(
    definition &&
      (isDefaultSpecifier || isDefaultImportSpecifier) &&
      isImportedBindingFromSource(variable, 'next/router')
  );
}

function isUseRouterBindingFromSource(variable, sourceValue) {
  const definition = getSingleImportDefinition(variable);

  return Boolean(
    definition &&
      definition.node &&
      definition.node.type === 'ImportSpecifier' &&
      definition.node.imported &&
      definition.node.imported.type === 'Identifier' &&
      definition.node.imported.name === 'useRouter' &&
      isImportedBindingFromSource(variable, sourceValue)
  );
}

function isVariableDeclaratorWithObjectLiteral(variable) {
  if (
    !variable ||
    !Array.isArray(variable.defs) ||
    variable.defs.length !== 1
  ) {
    return false;
  }

  const definition = variable.defs[0];
  const declarator = definition && definition.node;

  return Boolean(
    definition &&
      definition.type === 'Variable' &&
      declarator &&
      declarator.type === 'VariableDeclarator' &&
      definition.parent &&
      definition.parent.type === 'VariableDeclaration' &&
      definition.parent.kind === 'const' &&
      unwrapChain(declarator.init) &&
      unwrapChain(declarator.init).type === 'ObjectExpression'
  );
}

function isUseRouterHookResult(
  variable,
  getScope,
  sourceValue,
  requireConst
) {
  if (
    !variable ||
    !Array.isArray(variable.defs) ||
    variable.defs.length !== 1
  ) {
    return false;
  }

  const definition = variable.defs[0];
  const declarator = definition && definition.node;
  const declaration = definition && definition.parent;

  if (
    !definition ||
    definition.type !== 'Variable' ||
    !declarator ||
    declarator.type !== 'VariableDeclarator' ||
    !declarator.id ||
    declarator.id.type !== 'Identifier' ||
    !declaration ||
    declaration.type !== 'VariableDeclaration' ||
    (requireConst && declaration.kind !== 'const')
  ) {
    return false;
  }

  const call = unwrapChain(declarator.init);
  const callee = call && unwrapChain(call.callee);

  if (
    !call ||
    call.type !== 'CallExpression' ||
    !callee ||
    callee.type !== 'Identifier' ||
    call.arguments.length !== 0
  ) {
    return false;
  }

  return isUseRouterBindingFromSource(
    getVariableAtNode(callee, getScope),
    sourceValue
  );
}

function isNextRouterHookResult(variable, getScope) {
  return isUseRouterHookResult(variable, getScope, 'next/router', true);
}

function hasAdditionalWrites(variable) {
  if (!Array.isArray(variable.references)) {
    return true;
  }

  return variable.references.some(
    (reference) =>
      reference &&
      typeof reference.isWrite === 'function' &&
      reference.isWrite() &&
      reference.init !== true
  );
}

function isNextNavigationHookResult(variable, getScope) {
  return (
    isUseRouterHookResult(variable, getScope, 'next/navigation', false) &&
    !hasAdditionalWrites(variable)
  );
}

function isAllowedAutoDetectedIdentifier(node, fallbackNames, getScope) {
  if (typeof getScope !== 'function') {
    return fallbackNames.includes(node.name);
  }

  const variable = getVariableAtNode(node, getScope);

  if (!variable) {
    return fallbackNames.includes(node.name);
  }

  if (isNextRouterDefaultBinding(variable)) {
    return true;
  }

  if (isNextRouterHookResult(variable, getScope)) {
    return true;
  }

  if (isNextNavigationHookResult(variable, getScope)) {
    return false;
  }

  if (
    getSingleImportDefinition(variable) ||
    isVariableDeclaratorWithObjectLiteral(variable)
  ) {
    return false;
  }

  return fallbackNames.includes(node.name);
}

function isAllowedRouterObject(
  node,
  allowedNames,
  allowedPaths,
  bindingOptions
) {
  const objectNode = unwrapChain(node);
  const objPath = getMemberExpressionPath(objectNode);

  if (!objPath) {
    return false;
  }

  const hasAllowlist =
    (Array.isArray(allowedNames) && allowedNames.length > 0) ||
    (Array.isArray(allowedPaths) && allowedPaths.length > 0);

  if (!hasAllowlist) {
    return true;
  }

  if (objectNode.type === 'Identifier') {
    if (bindingOptions && bindingOptions.autoDetect) {
      return isAllowedAutoDetectedIdentifier(
        objectNode,
        allowedNames,
        bindingOptions.getScope
      );
    }

    return allowedNames.includes(objectNode.name);
  }

  return Array.isArray(allowedPaths) && allowedPaths.includes(objPath);
}

function isMemberExpressionOnAllowedObject(
  node,
  allowedNames,
  allowedPaths,
  allowedProps,
  bindingOptions
) {
  const n = unwrapChain(node);

  if (!n || n.type !== 'MemberExpression' || n.computed) {
    return false;
  }
  if (n.property.type !== 'Identifier') {
    return false;
  }
  if (!allowedProps.includes(n.property.name)) {
    return false;
  }

  return isAllowedRouterObject(
    n.object,
    allowedNames,
    allowedPaths,
    bindingOptions
  );
}

module.exports = {
  isAllowedRouterObject,
  isMemberExpressionOnAllowedObject,
};
