var PromiseThrottle = require('../lib/main');

var promiseThrottle = new PromiseThrottle({
  requestsPerSecond: 10
});

function createPromise(i) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      console.log(i + ': ' + Math.random());
      resolve(i);
    }, 10);
  });
}

var amountOfPromises = 20;
while (amountOfPromises-- > 0) {
  promiseThrottle.add(createPromise.bind(null, amountOfPromises));
}
