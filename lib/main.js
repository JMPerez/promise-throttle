export default PromiseThrottle = (function() {
  return function(options) {
    const requestsPerSecond = options.requestsPerSecond,
      promiseImplementation = options.promiseImplementation || Promise,
      queued = [];
    let lastStartTime = null;

    function execute() {
      lastStartTime = Date.now();
      const candidate = queued.shift();
      const aborted = candidate.signal && candidate.signal.aborted;
      if (aborted) {
        candidate.reject(new DOMException('', 'AbortError'));
      } else {
        candidate
          .promise()
          .then(function(r) {
            candidate.resolve(r);
          })
          .catch(function(r) {
            candidate.reject(r);
          });
      }
    }

    function dequeue() {
      if (queued.length > 0) {
        const now = Date.now(),
          weight = queued[0].weight,
          inc = (1000 / requestsPerSecond) * weight,
          elapsed = now - lastStartTime;

        if (elapsed >= inc) {
          execute();
        } else {
          // we have reached the limit, schedule a dequeue operation
          setTimeout(function() {
            dequeue();
          }, inc - elapsed);
        }
      }
    }

    function add(promise, options) {
      const opt = options || {};
      return new promiseImplementation(function(resolve, reject) {
        queued.push({
          resolve: resolve,
          reject: reject,
          promise: promise,
          weight: opt.weight || 1,
          signal: opt.signal,
        });

        dequeue();
      });
    }

    return {
      add: add,
      addAll: function(promises, options) {
        const addedPromises = promises.map(function(promise) {
          return add(promise, options);
        });

        return Promise.all(addedPromises);
      },
    };
  };
})();
