var Promise = require('promise'),
    PromiseThrottle = require('../lib/main');

var promiseThrottle = new PromiseThrottle({
  requestsPerSecond: 10,
  promiseImplementation: Promise
});

function createPromise() {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      console.log(Math.random());
    }, 10);
  });
}

var amountOfPromises = 1000;
while (amountOfPromises-- > 0) {
  promiseThrottle.add(function() {
    return createPromise();
  });
};
