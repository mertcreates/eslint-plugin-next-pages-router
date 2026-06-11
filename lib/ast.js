function unwrapChain(node) {
  return node && node.type === 'ChainExpression' ? node.expression : node;
}

function isStringLiteral(node) {
  const n = unwrapChain(node);

  return (
    (n && n.type === 'Literal' && typeof n.value === 'string') ||
    (n && n.type === 'TemplateLiteral' && n.expressions.length === 0)
  );
}

function getStringLiteralValue(node) {
  const n = unwrapChain(node);

  if (!n) {
    return null;
  }
  if (n.type === 'Literal') {
    return n.value;
  }
  if (n.type === 'TemplateLiteral') {
    return n.quasis[0].value.cooked;
  }

  return null;
}

function getMemberExpressionPath(node) {
  const n = unwrapChain(node);

  if (!n) {
    return null;
  }
  if (n.type === 'Identifier') {
    return n.name;
  }
  if (n.type !== 'MemberExpression' || n.computed) {
    return null;
  }
  if (n.property.type !== 'Identifier') {
    return null;
  }

  const left = getMemberExpressionPath(n.object);

  if (!left) {
    return null;
  }

  return left + '.' + n.property.name;
}

function getObjectPropertyValue(obj, keyName) {
  if (!obj || obj.type !== 'ObjectExpression') {
    return null;
  }

  for (const prop of obj.properties) {
    if (!prop || prop.type !== 'Property' || prop.computed) {
      continue;
    }

    const key = prop.key;
    const keyValue =
      key.type === 'Identifier' ? key.name : key.type === 'Literal' ? key.value : null;

    if (keyValue === keyName) {
      return prop.value;
    }
  }

  return null;
}

function getJsxAttributeValue(openingElement, attributeName) {
  if (!openingElement || openingElement.type !== 'JSXOpeningElement') {
    return null;
  }

  for (const attribute of openingElement.attributes || []) {
    if (attribute.type !== 'JSXAttribute') {
      continue;
    }

    if (
      !attribute.name ||
      attribute.name.type !== 'JSXIdentifier' ||
      attribute.name.name !== attributeName
    ) {
      continue;
    }

    if (!attribute.value) {
      return null;
    }

    if (
      attribute.value.type === 'Literal' ||
      attribute.value.type === 'TemplateLiteral'
    ) {
      return attribute.value;
    }

    if (attribute.value.type === 'JSXExpressionContainer') {
      return attribute.value.expression;
    }

    return null;
  }

  return null;
}

function getStaticStringValue(node, resolveIdentifierValue) {
  const n = unwrapChain(node);

  if (!n) {
    return null;
  }

  if (n.type === 'Literal') {
    return typeof n.value === 'string' ? n.value : null;
  }

  if (n.type === 'TemplateLiteral') {
    let value = '';

    for (let i = 0; i < n.quasis.length; i += 1) {
      const quasi = n.quasis[i];

      if (!quasi || !quasi.value || typeof quasi.value.cooked !== 'string') {
        return null;
      }

      value += quasi.value.cooked;

      if (i >= n.expressions.length) {
        continue;
      }

      const expressionValue = getStaticStringValue(
        n.expressions[i],
        resolveIdentifierValue
      );

      if (typeof expressionValue !== 'string') {
        return null;
      }

      value += expressionValue;
    }

    return value;
  }

  if (n.type === 'Identifier' && typeof resolveIdentifierValue === 'function') {
    const resolvedValue = resolveIdentifierValue(n);
    return typeof resolvedValue === 'string' ? resolvedValue : null;
  }

  return null;
}

function getMemberCallInfo(node) {
  const call = unwrapChain(node);

  if (!call || call.type !== 'CallExpression') {
    return null;
  }

  const callee = unwrapChain(call.callee);

  if (
    !callee ||
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier'
  ) {
    return null;
  }

  return {
    callNode: call,
    callee,
    method: callee.property.name,
  };
}

function getScopeVariable(scope, name) {
  for (let current = scope; current; current = current.upper) {
    if (current.set && typeof current.set.get === 'function') {
      const variable = current.set.get(name);

      if (variable) {
        return variable;
      }
    }

    if (Array.isArray(current.variables)) {
      const variable = current.variables.find(
        (candidate) => candidate && candidate.name === name
      );

      if (variable) {
        return variable;
      }
    }
  }

  return null;
}

function isImportedBindingFromSource(variable, sourceValue) {
  return (
    variable &&
    Array.isArray(variable.defs) &&
    variable.defs.length === 1 &&
    variable.defs[0] &&
    variable.defs[0].type === 'ImportBinding' &&
    variable.defs[0].parent &&
    variable.defs[0].parent.type === 'ImportDeclaration' &&
    variable.defs[0].parent.source &&
    variable.defs[0].parent.source.value === sourceValue
  );
}

function getRouterMethodCall(node, allowedMethods) {
  const callInfo = getMemberCallInfo(node);

  if (!callInfo) {
    return null;
  }

  const { callNode, callee, method } = callInfo;

  if (Array.isArray(allowedMethods) && !allowedMethods.includes(method)) {
    return null;
  }

  return { callNode, callee, method };
}

module.exports = {
  unwrapChain,
  isStringLiteral,
  getStringLiteralValue,
  getMemberExpressionPath,
  getObjectPropertyValue,
  getJsxAttributeValue,
  getStaticStringValue,
  getMemberCallInfo,
  getScopeVariable,
  isImportedBindingFromSource,
  getRouterMethodCall,
};
