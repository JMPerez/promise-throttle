Promise Throttle
==================

[![Build Status](https://travis-ci.org/JMPerez/promise-throttle.png)](https://travis-ci.org/JMPerez/promise-throttle/) &nbsp; [![Coverage Status](https://coveralls.io/repos/JMPerez/promise-throttle/badge.png?branch=master)](https://coveralls.io/r/JMPerez/promise-throttle?branch=master)

This is a small library to limit the amount of promises run per unit of time. It is useful for scenarios such as Rest APIs consumption, where we are normally rate-limited to a certain amount of requests per time.

It doesn't have any dependencies. If you are running this on Node.js, you will need to pass whatever Promise library you are using in the constructor.

Then, you add functions to the `PromiseThrottle` that, once called, return a `Promise`.

## Example

```javascript

  var promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 10,          // up to 10 requests per second
    promiseImplementation: Promise  // the Promise library you are using
  };

  var amountOfPromises = 1000;
  while (amountOfPromises-- > 0) {
    promiseThrottle.add(function() {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          console.log(Math.random());
        }, 10);
      });
    });
  };

```

## Installation

Install the module with: `npm install promise-throttle`

## License

MIT