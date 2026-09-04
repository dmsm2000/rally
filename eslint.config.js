// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended, prettierConfig],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@angular-eslint/component-selector': ['warn', { type: 'element', prefix: ['rally', 'ui'], style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['warn', { type: 'attribute', prefix: ['rally', 'ui'], style: 'camelCase' }],
      '@angular-eslint/component-class-suffix': 'warn',
      '@angular-eslint/directive-class-suffix': 'warn',
      '@angular-eslint/no-inputs-metadata-property': 'warn',
      '@angular-eslint/no-outputs-metadata-property': 'warn',
      '@angular-eslint/use-lifecycle-interface': 'warn',
      '@angular-eslint/use-pipe-transform-interface': 'warn',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/consistent-type-definitions': 'warn',
      '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
      // Angular's DI idiom puts `private readonly x = inject(...)` at the top of the class, which
      // the rule's default public-before-private field order fights on every single service. What is
      // actually worth enforcing here is the coarse shape of a class: fields, constructor, methods.
      '@typescript-eslint/member-ordering': [
        'warn',
        {
          default: [
            'signature',
            'call-signature',
            'static-field',
            'instance-field',
            'abstract-field',
            'static-initialization',
            'constructor',
            'static-method',
            'instance-method',
            'abstract-method',
          ],
        },
      ],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-misused-new': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-unused-expressions': ['warn', { allowShortCircuit: true }],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/prefer-readonly': 'warn',
      '@typescript-eslint/promise-function-async': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/unified-signatures': 'warn',
      'arrow-body-style': 'warn',
      'brace-style': ['warn', '1tbs'],
      curly: 'warn',
      'eol-last': 'warn',
      eqeqeq: ['warn', 'smart'],
      'id-denylist': ['warn', 'any', 'Number', 'number', 'String', 'Boolean', 'boolean', 'Undefined', 'undefined'],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'no-bitwise': 'warn',
      'no-caller': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'warn',
      'no-eval': 'warn',
      'no-new-wrappers': 'warn',
      'no-throw-literal': 'warn',
      'no-trailing-spaces': 'warn',
      'no-undef-init': 'warn',
      'no-unused-labels': 'warn',
      // `void somePromise()` as a statement is the deliberate fire-and-forget marker used across
      // the services; only a `void` used for its value is a mistake worth flagging.
      'no-void': ['warn', { allowAsStatement: true }],
      'prefer-const': 'warn',
      radix: 'warn',
    },
  },
  {
    // Flat data tables, not logic: a translation dictionary and the mock dataset are long because
    // they have many entries, and splitting either one would only make a key harder to find.
    // max-lines measures nothing useful here.
    files: ['src/app/core/i18n/translations/*.ts', 'src/app/core/data/rally-dataset.ts'],
    rules: { 'max-lines': 'off' },
  },
  {
    // `Court.number` is the court's number painted on the ground, and mirrors the `courts.number`
    // column. The denylist exists to catch meaningless variable names like `const number = 5`;
    // renaming a real domain field to satisfy it would only make the model diverge from the schema.
    files: ['src/app/core/models/court.model.ts', 'src/app/features/courts/**/*.ts'],
    rules: {
      'id-denylist': ['warn', 'any', 'Number', 'String', 'Boolean', 'boolean', 'Undefined', 'undefined'],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // These wrap a real <input> and are labelable through it, so a <label> around one is
      // correctly associated in the DOM — the rule just can't see through a custom element.
      '@angular-eslint/template/label-has-associated-control': [
        'error',
        { controlComponents: ['ui-autocomplete', 'ui-date-picker', 'ui-time-picker'] },
      ],
    },
  },
);
