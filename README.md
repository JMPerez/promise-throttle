Promise Throttle &nbsp; [![Build Status](https://api.travis-ci.org/JMPerez/promise-throttle.svg)](https://travis-ci.org/JMPerez/promise-throttle/) [![Coverage Status](https://coveralls.io/repos/github/JMPerez/promise-throttle/badge.svg?branch=master)](https://coveralls.io/r/JMPerez/promise-throttle?branch=master)
==================

This is a small library to limit the amount of promises run per unit of time. It is useful for scenarios such as Rest APIs consumption, where we are normally rate-limited to a certain amount of requests per time.

It doesn't have any dependencies. If you are running this on Node.js, you will need to pass whatever Promise library you are using in the constructor.

Then, you add functions to the `PromiseThrottle` that, once called, return a `Promise`.

## Use

The library can be used either server-side or in the browser.

```javascript
  var PromiseThrottle = require('promise-throttle');
  /**
   * A function that once called returns a promise
   * @return Promise
   */
  var myFunction = function(i) {
    return new Promise(function(resolve, reject) {
      // here we simulate that the promise runs some code
      // asynchronously
      setTimeout(function() {
        console.log(i + ": " + Math.random());
        resolve(i);
      }, 10);
    });
  };

  var promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 1,           // up to 1 request per second
    promiseImplementation: Promise  // the Promise library you are using
  });

  var amountOfPromises = 10;
  while (amountOfPromises-- > 0) {
    promiseThrottle.add(myFunction.bind(this, amountOfPromises))
      .then(function(i) {
        console.log("Promise " + i + " done");
      });
  }

  // example using Promise.all
  var one = promiseThrottle.add(myFunction.bind(this, 1));
  var two = promiseThrottle.add(myFunction.bind(this, 2));
  var three = promiseThrottle.add(myFunction.bind(this, 3));

  Promise.all([one, two, three])
    .then(function(r) {
        console.log("Promises " + r.join(", ") + " done");
    });
```

## Installation

For node.js, install the module with: `npm i promise-throttle`

If you are using it in a browser, you can use bower: `bower install promise-throttle`

## Development

Install the dependencies using `npm install`.
Run `npm start` to lint, test and browserify promise-thottle.

## Projects using it

See how some projects are using it:

- [ivasilov/promised-twitter](https://github.com/ivasilov/promised-twitter)
- [JMPerez/spotify-dedup](https://github.com/JMPerez/spotify-dedup)
- [johannesss/randify](https://github.com/johannesss/randify)
- [JoseBarrios/mturk-api](https://github.com/JoseBarrios/mturk-api)
- [zackiles/lucy-bot](https://github.com/zackiles/lucy-bot)

## License

MIT
