import layersRule from './layers';
import sortedImportsRule from './sorted-imports';
import customJsxRule from './custom-jsx';

module.exports = {
  configs: {
    recommended: {
      plugins: ['muralco'],
      rules: {
        'muralco/sorted-imports': 'error',
      },
    },
  },
  rules: {
    'custom-jsx': customJsxRule,
    layers: layersRule,
    'sorted-imports': sortedImportsRule,
  },
};
