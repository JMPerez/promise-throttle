const PromiseThrottle = require('../lib/main');

const throttle = new PromiseThrottle({ requestsPerSecond: 5 });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const start = Date.now();

// each task takes 100ms, but only 5 of them start per second
const tasks = Array.from({ length: 10 }, (_, i) => async () => {
  console.log(`Task ${i} started after ${Date.now() - start}ms`);
  await wait(100);
  return i;
});

throttle.addAll(tasks).then((results) => console.log('Results:', results));
