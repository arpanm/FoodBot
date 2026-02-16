/** @type {import('prettier').Config} */
module.exports = {
  // Line length
  printWidth: 100,

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Semicolons
  semi: true,

  // Quotes
  singleQuote: true,
  quoteProps: 'as-needed',

  // JSX
  jsxSingleQuote: false,
  jsxBracketSameLine: false,

  // Trailing commas
  trailingComma: 'es5',

  // Bracket spacing
  bracketSpacing: true,

  // Arrow functions
  arrowParens: 'avoid',

  // Range formatting
  rangeStart: 0,
  rangeEnd: Infinity,

  // Require pragma
  requirePragma: false,
  insertPragma: false,

  // Prose wrap
  proseWrap: 'preserve',

  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',

  // Line endings
  endOfLine: 'lf',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // Vue files
  vueIndentScriptAndStyle: false,

  // Plugin overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 80,
      },
    },
    {
      files: '*.yaml',
      options: {
        printWidth: 80,
        singleQuote: false,
      },
    },
  ],
};
