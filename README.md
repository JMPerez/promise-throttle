Promise Throttle &nbsp; [![CI](https://github.com/JMPerez/promise-throttle/actions/workflows/ci.yml/badge.svg)](https://github.com/JMPerez/promise-throttle/actions/workflows/ci.yml)
==================


This small ([less than 1KB minified and compressed](https://bundlephobia.com/package/promise-throttle)) dependency-free library limits promises run per unit of time. Useful for Rest API consumption, which is normally rate-limited to a certain number of requests in a set amount of time.

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
    requestsPerSecond: 1 // up to 1 request per second
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

The promise returned by `add` is resolved or rejected with the result of the function. If the function throws, the promise is rejected with the thrown error, and if it returns a value that is not a promise, the promise is resolved with that value.

### Constructor options

#### requestsPerSecond
The maximum amount of functions that will be called per second. It must be a positive number, otherwise the constructor throws a `TypeError`. Use `Infinity` to disable throttling.

#### promiseImplementation
The `Promise` constructor used to create the promises returned by `add` and `addAll`. It defaults to the native `Promise`, so you only need it if you want to use a different library (e.g. [promise](https://www.npmjs.com/package/promise) or [bluebird](https://www.npmjs.com/package/bluebird)).

```javascript
  var promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 5,
    promiseImplementation: require('bluebird')
  });
```

### Options for `add` and `addAll`

#### weight
You can specify `weight` option for each promise to dynamically adjust throttling depending on
action "heaviness". For example, action with `weight = 2` will be throttled as two regular actions: it is started as soon as it is its turn, and the next action waits twice as long as it would after a regular one. By default weight of all actions is 1.

```javascript
  var regularAction = promiseThrottle.add(performRegularCall);
  var heavyAction = promiseThrottle.add(performHeavyCall, {weight: 2});
```

#### signal
You can cancel queued promises using an [AbortSignal](https://developer.mozilla.org/docs/Web/API/AbortController). For this, pass a `signal` option obtained from an `AbortController`. Once it is aborted, the queued promises using the signal are rejected right away, and they don't count towards the limit of requests per second. Functions that have already been called are not affected.

```js
  var controller = new AbortController();
  var signal = controller.signal;
  var pt = new PromiseThrottle({ requestsPerSecond: 10 });
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
  var pt = new PromiseThrottle({ requestsPerSecond: 10 });
  pt.add(function() { return fetch('example.com/a') });
  pt.add(function() { return fetch('example.com/b') }, {signal: signal});
  pt.add(function() { return fetch('example.com/c') });
  ...

  // let's abort the second one
  controller.abort();
```

When aborting, the promise returned by `add` or `addAll` is rejected with the reason of the signal, which is an `AbortError` unless you pass a different one to `controller.abort(reason)`. In environments that don't support `signal.reason`, it is rejected with an error whose `name` is `AbortError`:

```js
  var controller = new AbortController();
  var signal = controller.signal;
  var pt = new PromiseThrottle({ requestsPerSecond: 10 });
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

## TypeScript

The package includes type definitions. With `esModuleInterop` enabled (or when using ES modules):

```ts
import PromiseThrottle, { QueueOptions } from 'promise-throttle';
```

Otherwise use `import PromiseThrottle = require('promise-throttle');`.

## Installation

For node.js, install the module with: `npm i promise-throttle`

If you are using it in a browser without a bundler, you can load it from a CDN. It exposes a global `PromiseThrottle`:

```html
<script src="https://cdn.jsdelivr.net/npm/promise-throttle@2"></script>
```

## Upgrading from 1.x

- The `weight` of an action now delays the action that comes after it, instead of the action itself.
- Aborted promises are rejected as soon as the signal is aborted, with `signal.reason` when available.
- The constructor throws a `TypeError` when `requestsPerSecond` is not a positive number.
- The type definitions use `export =`. Enable `esModuleInterop` to keep using `import PromiseThrottle from 'promise-throttle'`.

## Development

Install the dependencies using `npm install`.
Run `npm test` to lint and run the tests with code coverage, and `npm run dist` to generate the browser build.

## Projects using it

See how some projects are using it:

- [ivasilov/promised-twitter](https://github.com/ivasilov/promised-twitter)
- [JMPerez/spotify-dedup](https://github.com/JMPerez/spotify-dedup)
- [johannesss/randify](https://github.com/johannesss/randify)
- [JoseBarrios/mturk-api](https://github.com/JoseBarrios/mturk-api)
- [zackiles/lucy-bot](https://github.com/zackiles/lucy-bot)

## License

MIT
