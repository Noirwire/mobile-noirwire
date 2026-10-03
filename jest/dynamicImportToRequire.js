/**
 * Jest runs CommonJS and cannot evaluate `import()` without an experimental
 * flag, while Metro bundles it natively. The shared package loads its
 * password dictionaries with `import()`, so under test each one becomes a
 * require that resolves on the next tick, which is what Metro does too.
 */
module.exports = function dynamicImportToRequire({ types: t }) {
  return {
    name: "dynamic-import-to-require",
    visitor: {
      CallExpression(path) {
        if (!t.isImport(path.node.callee)) return;
        const required = t.callExpression(t.identifier("require"), path.node.arguments);
        const later = t.arrowFunctionExpression([], required);
        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.memberExpression(t.identifier("Promise"), t.identifier("resolve")),
                [],
              ),
              t.identifier("then"),
            ),
            [later],
          ),
        );
      },
    },
  };
};
