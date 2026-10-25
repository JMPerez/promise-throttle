Promise Throttle &nbsp; [![CI](https://github.com/JMPerez/promise-throttle/actions/workflows/ci.yml/badge.svg)](https://github.com/JMPerez/promise-throttle/actions/workflows/ci.yml)
==================


This small ([less than 1KB minified and compressed](https://bundlephobia.com/package/promise-throttle)) dependency-free library limits promises run per unit of time. Useful for Rest API consumption, which is normally rate-limited to a certain number of requests in a set amount of time.

To use, simply add functions to the `PromiseThrottle` that, once called, return a `Promise`.

The API reference is available at [jmperez.github.io/promise-throttle](https://jmperez.github.io/promise-throttle/).

## Installation

```sh
npm install promise-throttle
```

It works in Node.js 14+ and modern browsers. If you are using it in a browser without a bundler, you can load it from a CDN. It exposes a global `PromiseThrottle`:

```html
<script src="https://cdn.jsdelivr.net/npm/promise-throttle@2"></script>
<script>
  const throttle = new PromiseThrottle({ requestsPerSecond: 5 });
</script>
```

## Use

```js
import PromiseThrottle from 'promise-throttle'; // or: const PromiseThrottle = require('promise-throttle');

const throttle = new PromiseThrottle({ requestsPerSecond: 2 });

// Pass a function that returns a promise. It is called when the throttling allows it
const response = await throttle.add(() => fetch('https://api.example.com/users/1'));

// Queue several functions at once. These 6 requests are spread over ~2.5 seconds
const ids = [1, 2, 3, 4, 5, 6];
const users = await throttle.addAll(
  ids.map((id) => () => fetch(`https://api.example.com/users/${id}`).then((res) => res.json()))
);
```

Make sure you pass a function and not a promise: `throttle.add(fetch(url))` would send the request right away, because the promise has already been created.

The promise returned by `add` is resolved or rejected with the result of the function. If the function throws, the promise is rejected with the thrown error, and if it returns a value that is not a promise, the promise is resolved with that value.

### Constructor options

#### requestsPerSecond
The maximum amount of functions that will be called per second. It must be a positive number, otherwise the constructor throws a `TypeError`. Use `Infinity` to disable throttling.

#### promiseImplementation
The `Promise` constructor used to create the promises returned by `add` and `addAll`. It defaults to the native `Promise`, so you only need it if you want to use a different library (e.g. [promise](https://www.npmjs.com/package/promise) or [bluebird](https://www.npmjs.com/package/bluebird)).

```js
import Bluebird from 'bluebird';

const throttle = new PromiseThrottle({
  requestsPerSecond: 5,
  promiseImplementation: Bluebird
});
```

### Options for add and addAll

#### weight
You can specify `weight` option for each function to dynamically adjust throttling depending on
action "heaviness". For example, an action with `weight: 3` will be throttled as three regular actions: it is called as soon as it is its turn, and the next action waits three times as long as it would after a regular one. By default weight of all actions is 1.

```js
// The search endpoint counts as 3 requests in the API rate limit
throttle.add(() => fetch('https://api.example.com/search?q=foo'), { weight: 3 });
```

#### signal
You can cancel queued functions using an [AbortSignal](https://developer.mozilla.org/docs/Web/API/AbortController). Once it is aborted, the queued functions added with the signal are not called and their promises are rejected right away, without counting towards the limit of requests per second. Functions added without the signal are not affected, so you can make only some of them abortable.

Functions that have already been called are not affected either, but you can pass the same signal to them (e.g. to `fetch`) to cancel what they are doing:

```js
const controller = new AbortController();
const { signal } = controller;

throttle
  .addAll(urls.map((url) => () => fetch(url, { signal })), { signal })
  .catch((error) => {
    if (error.name === 'AbortError') {
      console.log('Requests cancelled');
    }
  });

// later, e.g. when the user leaves the page
controller.abort();
```

When aborting, the promise returned by `add` or `addAll` is rejected with the reason of the signal, which is an `AbortError` unless you pass a different one to `controller.abort(reason)`. In environments that don't support `signal.reason`, it is rejected with an error whose `name` is `AbortError`.

## TypeScript

The package includes type definitions. With `esModuleInterop` enabled (or when using ES modules):

```ts
import PromiseThrottle, { QueueOptions } from 'promise-throttle';
```

Otherwise use `import PromiseThrottle = require('promise-throttle');`.

## Upgrading from 1.x

- The `weight` of an action now delays the action that comes after it, instead of the action itself.
- Aborted promises are rejected as soon as the signal is aborted, with `signal.reason` when available.
- The constructor throws a `TypeError` when `requestsPerSecond` is not a positive number.
- The type definitions use `export =`. Enable `esModuleInterop` to keep using `import PromiseThrottle from 'promise-throttle'`.

## Development

Install the dependencies using `npm install`.
Run `npm test` to lint and run the tests with code coverage, `npm run dist` to generate the browser build, and `npm run docs` to generate the documentation site in `docs/`.

## Projects using it

See how some projects are using it:

- [ivasilov/promised-twitter](https://github.com/ivasilov/promised-twitter)
- [JMPerez/spotify-dedup](https://github.com/JMPerez/spotify-dedup)
- [JoseBarrios/mturk-api](https://github.com/JoseBarrios/mturk-api)
- [zackiles/lucy-bot](https://github.com/zackiles/lucy-bot)

## License

MIT
