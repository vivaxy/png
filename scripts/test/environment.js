/**
 * @since 2019-12-31 11:27
 * @author vivaxy
 */
const path = require('path');
const glob = require('fast-glob');
const NodeEnvironment = require('jest-environment-node');

module.exports = class PNGTestEnvironment extends NodeEnvironment {
  constructor(config, { docblockPragmas, testPath }) {
    super(config);
    this.todo = docblockPragmas.todo || [];
    this.only = docblockPragmas.only;
    this.testFilePath = testPath;
  }

  async setup() {
    const fixturesPath = path.join(this.testFilePath, '..', 'fixtures');
    const testcaseNames = await glob('*', {
      cwd: fixturesPath,
      onlyDirectories: true,
    });
    const filteredTestcaseNames = testcaseNames.filter((testcaseName) => {
      if (this.only) {
        return testcaseName === this.only;
      }
      return !this.todo.includes(testcaseName);
    });
    this.global.testcases = filteredTestcaseNames.map(function(testcaseName) {
      return [testcaseName, path.join(fixturesPath, testcaseName)];
    });
    await super.setup();
  }
};
