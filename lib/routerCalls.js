const { getRouterMethodCall } = require('./ast');
const { isAllowedRouterObject } = require('./routerObjects');

function getAllowedRouterMethodCall(
  node,
  allowedNames,
  allowedPaths,
  allowedMethods,
  bindingOptions
) {
  const callInfo = getRouterMethodCall(node, allowedMethods);

  if (!callInfo) {
    return null;
  }

  const { callNode, callee, method } = callInfo;

  if (
    !isAllowedRouterObject(
      callee.object,
      allowedNames,
      allowedPaths,
      bindingOptions
    )
  ) {
    return null;
  }

  return { callNode, method };
}

module.exports = {
  getAllowedRouterMethodCall,
};
