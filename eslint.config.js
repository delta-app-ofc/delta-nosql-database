const errorRules = {
  "no-undef": "error",
  "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  "no-redeclare": "error"
};

export default [
  {
    ignores: ["node_modules/**"]
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        db: "readonly",
        NumberInt: "readonly",
        NumberLong: "readonly",
        print: "readonly",
        use: "readonly"
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error"
    },
    rules: errorRules
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        afterAll: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        Buffer: "readonly",
        clearInterval: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
        process: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        test: "readonly"
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error"
    },
    rules: errorRules
  }
];
