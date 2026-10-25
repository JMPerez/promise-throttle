Contributing
============

Feel free to send your PR to fix any bug or add new functionality!
Follow these steps:

1. Fork the repository.
2. Make the changes. Follow the coding standards defined in the ESLint configuration
  file.
3. Remember to add tests. Have a look at the `__tests__` folder to see the test
  suite covering the code. Want to run the tests? Run `npm test`. You will also get a code coverage report for free.
4. Send a Pull Request.

Releasing a new version
=======================

1. Regenerate the browser build with `npm run dist` and commit it if it changed.
2. Update npm module version in the `package.json` file, using `npm version`.
3. Push with tags: `git push --follow-tags`
4. Draft a new release
5. Publish a new npm package: `npm publish`
6. Profit

Thanks for collaborating!
