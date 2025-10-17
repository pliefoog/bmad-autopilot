/**
 * Babel plugin to replace import.meta with a compatible polyfill for web builds
 */
module.exports = function({ types: t }) {
  return {
    name: 'replace-import-meta',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          // Replace import.meta with a polyfill object
          path.replaceWith(
            t.objectExpression([
              t.objectProperty(
                t.identifier('url'),
                t.stringLiteral(typeof window !== 'undefined' ? window.location.href : '')
              ),
              t.objectProperty(
                t.identifier('env'),
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('NODE_ENV'),
                    t.stringLiteral(process.env.NODE_ENV || 'development')
                  )
                ])
              )
            ])
          );
        }
      }
    }
  };
};