const RateLimitRedis = require("./rate_limit_redis");
const queue = require("./queue");
const cache = require("./cache");

let rateLimitRedis = async function (options) {
  const { headers = true } = options;

  global.rateLimitRedis = new RateLimitRedis(options);

  return function (req, res, next) {
    global.rateLimitRedis
      .process(req)
      .then(function (result = {}) {
        if (headers) {
          res.set("x-ratelimit-limit", result.limit);
          res.set("x-ratelimit-remaining", result.remaining);
          res.set("retry-after", result.retry);
        }

        res.status(result.status);
        next();
      })
      .catch(next);
  };
};

function middleware(request, response, next) {
  // ignore whitelisted ips
  if (
    Array.isArray(global.rateLimitRedis.whitelist) &&
    global.rateLimitRedis.whitelist.length
  ) {
    if (
      global.rateLimitRedis.whitelist.includes(
        request.headers["X-Forwarded-For"] || request.ip
      )
    ) {
      // delete response.limit;
      next();
    }
  }

  /**
   * push task to the queue, so it can be process later (without blocking the request)
   * process will lookup usage data on Redis and update the local cache
   */

  queue.push(() => {
    global.rateLimitRedis
      .process(request)
      .then((result = {}) => {
        // console.log(result);

        cache.set(
          result.ip,
          result,
          result.retry || global.rateLimitRedis.limit
        );
      })
      .catch(console.log);
  });

  /// use cache to get user's usage data, and throttle the user if needed
  const usageData = {
    ...{
      ttl: ((cache.getTtl(request.ip) - new Date().getTime()) / 1000).toFixed(),
    },
    ...cache.get(request.ip),
  };
  /**
   * Set headers
   */
  response.set(
    "x-ratelimit-limit",
    usageData.limit || global.rateLimitRedis.limit
  );
  response.set(
    "x-ratelimit-remaining",
    usageData.remaining == 0
      ? usageData.remaining
      : usageData.remaining - 1 || global.rateLimitRedis.limit - 1
  );
  response.set("retry-after", usageData.retry ? usageData.ttl : 0);

  /**
   * user has exceeded the usage limit
   */
  if (usageData?.status === 429) {
    response.send(usageData.status);
  } else {
    /// else go through
    next();
  }
}

module.exports = { RateLimitRedis, rateLimitRedis, middleware };
