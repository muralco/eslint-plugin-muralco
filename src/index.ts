import sortedImportsRule from './sorted-imports';

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
    'sorted-imports': sortedImportsRule,
  },
};
