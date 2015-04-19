# ==============================================================================
# Node Tests
# ==============================================================================

REPORTER = spec

all: lint test coverage dist

install:
	npm install && npm install eslint -g

lint:
	eslint lib/*.js

dist:
	mkdir -p dist && browserify lib/browser.js -o dist/promise-throttle.js

test:
	@NODE_ENV=test NODE_PATH=lib ./node_modules/.bin/mocha \
		--reporter $(REPORTER)

coverage:
	@NODE_ENV=test NODE_PATH=lib ./node_modules/.bin/mocha \
		--require blanket \
		--reporter html-cov > ./test/coverage.html

coveralls:
	$(MAKE) test

	@NODE_ENV=test NODE_PATH=lib ./node_modules/.bin/mocha \
		--require blanket \
		--reporter mocha-lcov-reporter | ./node_modules/coveralls/bin/coveralls.js

# ==============================================================================
# Static Analysis
# ==============================================================================

.PHONY: lint test coverage dist