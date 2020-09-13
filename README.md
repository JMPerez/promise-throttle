Promise Throttle &nbsp; [![Build Status](https://api.travis-ci.org/JMPerez/promise-throttle.svg)](https://travis-ci.org/JMPerez/promise-throttle/) [![Coverage Status](https://coveralls.io/repos/github/JMPerez/promise-throttle/badge.svg?branch=master)](https://coveralls.io/r/JMPerez/promise-throttle?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/JMPerez/promise-throttle.svg)](https://greenkeeper.io/)
==================


This small ([~530B minified and compressed](https://cost-of-modules.herokuapp.com/result?p=promise-throttle)) dependency-free library limits promises run per unit of time. Useful for Rest API consumption, which is normally rate-limited to a certain number of requests in a set amount of time.

On Node.js, pass the Promise library you are using to the constructor.

To use, simply add functions to the `PromiseThrottle` that, once called, return a `Promise`.

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

### Options

#### weight
You can specify `weight` option for each promise to dynamically adjust throttling depending on
action "heaviness". For example, action with `weight = 2` will be throttled as two regular actions. By default weight of all actions is 1.

```javascript
  var regularAction = promiseThrottle.add(performRegularCall);
  var heavyAction = promiseThrottle.add(performHeavyCall, {weight: 2});
```

#### signal
You can cancel queued promises using an [AbortSignal](https://developer.mozilla.org/docs/Web/API/AbortController). For this, pass a `signal` option obtained from an `AbortController`. Once it is aborted, the promises queued using the signal will be rejected.

If the environment where you are running the code doesn't support AbortController, you can use [a polyfill](https://github.com/mo/abortcontroller-polyfill).

```js
  var controller = new AbortController();
  var signal = controller.signal;
  var pt = createPromiseThrottle(10);
  pt.addAll([
    function() {
      return fetch('example.com/a');
    },
    function() {
      return fetch('example.com/b');
    },
    function() {
      ...
    }
  ], {signal: signal});
  ...

  // let's abort the promises
  controller.abort();
```

You can decide to make only specific promises abortable:

```js
  var controller = new AbortController();
  var signal = controller.signal;
  var pt = createPromiseThrottle(10);
  pt.add(function() { return fetch('example.com/a') });
  pt.add(function() { return fetch('example.com/b') }, {signal: signal});
  pt.add(function() { return fetch('example.com/c') });
  ...

  // let's abort the second one
  controller.abort();
```

When aborting, the promise returned by `add` or `addAll` is rejected with a specific error:

```js
  var controller = new AbortController();
  var signal = controller.signal;
  var pt = createPromiseThrottle(10);
  pt.addAll([
    function() {
      return fetch('example.com/a');
    },
    function() {
      return fetch('example.com/b');
    },
    function() {
      ...
    }
  ], {signal: signal}).catch(function(e) {
    if (e.name === 'AbortError') {
      console.log('Promises aborted');
    }
  });
  ...

  // let's abort the promises
  controller.abort();
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
