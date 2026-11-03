// Runs the behaviour claims with the pinned Jest. A project per config flag keeps each flag's effect separate.
const project = (displayName, testMatch, flags = {}) => ({
  displayName,
  rootDir: __dirname,
  testEnvironment: "node",
  testMatch: [`<rootDir>/${testMatch}`],
  ...flags,
});

module.exports = {
  projects: [
    project("claims", "*.test.cjs"),
    project("restoreMocks", "flags/restore-only.test.cjs", { restoreMocks: true }),
    project("clearMocks+restoreMocks", "flags/clear-restore.test.cjs", { clearMocks: true, restoreMocks: true }),
    project("resetMocks", "flags/reset.test.cjs", { resetMocks: true }),
  ],
};
