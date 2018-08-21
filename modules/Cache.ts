import * as Promise from "bluebird";
import * as _ from "lodash";
import * as Response from "./Response";

const Cache: iCache = Default;
const __store: iCacheStore = {};
const __config: iCacheOptions = {
  timeout: 30000
};

function Default<T>(type: string, namespace: string, key: string | string[], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T | (T | Response.error)[]> {
  return value ? Cache.set(type, namespace, key, value, options) : Cache.get(type, namespace, key);
}

/**
 * Attempt to retrieve a value from the cache tied to a type, namespace and the first key in a list of keys.
 * If a cache hit occurs, this function either returns a pending promise to be resolved that updates the cache value or the cache value if none is pending.
 * If a cache miss occurs, this function returns a rejection with value null.
 */

function cacheGet<T>(type: string, namespace: string, key: string | string[]): Promise<T | (T | Response.error)[]> {
  return Promise.map(_.concat(key), key => {
    const object = _.get(__store, [type, namespace, key], {});
    if (object.promise) { return object.promise; }
    if (object.timeout && object.timeout) { object.timeout.refresh(); }
    if (object.value) { return object.value; }
    return new Response.error(404, "cache", {type: type, namespace: namespace, keys: key});
  })
  .then(values => {
    if (_.every(values, value => value instanceof Response.error)) { return Promise.reject(new Response.error(404, "cache", _.reduce(values, (r, v) => _.concat(r, v.content), []))); }
    if (values.length > 1) { return values; }
    if (values[0] instanceof Response.error) { return values[0]; }
    return Promise.reject(values[0]);
  });
}

Cache.get = cacheGet;

function cacheSet<T>(type: string, namespace: string, key: string | string[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> {
  const keys = _.concat(key);
  return new Promise<T>((resolve, reject) => {
    if (_.some(keys, key => _.get(__store, [type, namespace, key, "promise"]))) {
      console.log(keys);
      return reject(new Response.error(409, "cache", _.reduce(_.concat(key), (r, k) => _.get(__store, [type, namespace, k, "promise"]) ? _.concat(r, k) : r, [])));
    }
    const promise = typeof value === "function" ? value() : Promise.resolve(value);
    _.each(keys, key => _.set(__store, [type, namespace, key, "promise"], promise));
    resolve(promise);
  })
  .then(res => {
    _.each(keys, key => {
      _.unset(__store, [type, namespace, key, "promise"]);
      _.setWith(__store, [type, namespace, key], {
        value:   res,
        timeout: Cache.getTimeout(type, namespace, key, _.get(options, "timeout"))
      }, Object);
    });
    return res;
  });
}

Cache.set = cacheSet;

function cacheTry<T>(type: string, namespace: string, key: string | string[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T | (T | Response.error)[]> {
  let promise;
  
  return Promise.map(_.concat(key), key => {
    return Cache.get<T>(type, namespace, key)
    .catch(err => {
      if (err.code !== 404 || err.type !== "any") { return new Response.error(500, "any", err); }
      if (!promise) { promise = typeof value === "function" ? value() : Promise.resolve(value); }
      return Cache.set(type, namespace, key, promise, options)
      .catch(err => {
        if (err.code !== 404 || err.type !== "any") { return new Response.error(500, "any", err); }
        return err;
      });
    });
  });
}

Cache.try = cacheTry;

Cache.unset = (type: string, namespace: string, key: string | string[]) => {
  _.each(_.concat(key), key => {
    const current: iCacheObject = _.get(__store, [type, namespace, key]);
    if (current.timeout) { clearInterval(current.timeout); }
    _.unset(__store, [type, namespace, key]);
  });
};

/**
 * Helper method to create a timeout that will remove a value from the cache after a set amount of milliseconds.
 *
 * @param type          The data type of the value.
 * @param namespace     The namespace that the value populates.
 * @param key           The key which the value occupies.
 * @param milliseconds  How many milliseconds the value should exist for before deletion if not refreshed. Null creates no timeout, 0 means immediately (synchronous), and any other value means asynchronous.
 */

function cacheGetTimeout(type: string, namespace: string, key: string, milliseconds: number): iCacheTimer {
  if (milliseconds === null) { return null; }
  if (milliseconds === 0) {
    _.unset(__store, [type, namespace, key]);
    return undefined;
  }
  return <iCacheTimer>setTimeout(() => _.unset(__store, [type, namespace, key]), milliseconds || __config.timeout);
}

Cache.getTimeout = cacheGetTimeout;

/**
 * Helper method to generate a set of key strings from a given set of keys.
 *
 * @param fragments    Single set of symbols, array of sets of symbols or two-dimensional array of sets of symbols.
 */

function cacheCreateKeys(fragments: number | string | (number | string)[] | (number | string)[][]): string[] {
  const type = !_.isArray(fragments) || !_.isArray(fragments[0]) || (fragments.length === 1 && (<string[]>fragments[0]).length === 1) ? 1 : 2;
  const keys = _.reduce(type === 2 ? <string[][]>fragments : _.flattenDeep([fragments]), (r, v) => {
    if (!_.isString(v) && !_.isNumber(v) && !_.isArray(v)) { return r; }
    if (type === 1 && _.isArray(v) || type === 2 && !_.isArray(v)) { return r; }
    return _.concat(r, type === 2 ? _.join(<string[]>v, "::") : v);
  }, []);
  return type === 2 ? _.uniq(keys) : [_.join(keys, "::")];
}

Cache.createKeys = cacheCreateKeys;

/**
 * Helper method to get the values, promises and/or timeouts from a specific namespace.
 *
 * @param type        The data type related to the namespace.
 * @param namespace   The namespace to get values from.
 * @param options     Options to choose if values, promises and/timeouts should be shown.
 */

function cacheGetNamespace(type: string, namespace: string, options: iGetNamespaceOptions = {promise: true, value: true}): {[key: string]: iCacheObject} {
  return _.mapValues(<{[key: string]: iCacheObject}>_.get(__store, [type, namespace]), value => _.pickBy(value, (v, key) => options[key]));
}

Cache.getNamespace = cacheGetNamespace;

Cache.types = {
  QUERY:    "query",
  RESOURCE: "resource",
  EXTERNAL: "external",
  REQUEST:  "request"
};

export = Cache;

interface iCache {
  get?: {
    <T>(type: string, namespace: string, key: string): Promise<T>
    <T>(type: string, namespace: string, key: string | string[]): Promise<(T | Response.error)[]>
  }
  set?: <T>(type: string, namespace: string, key: string | string[], value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  try?: {
    <T>(type: string, namespace: string, key: string, value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T>
    <T>(type: string, namespace: string, key: string | string[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<(T | Response.error)[]>
  }
  unset?: (type: string, namespace: string, key: string | string[]) => void
  
  getNamespace?: (type: string, namespace: string, options?: iGetNamespaceOptions) => {[key: string]: iCacheObject};
  getTimeout?: (type: string, namespace: string, key: string, milliseconds?: number) => NodeJS.Timer
  createKeys?: (keys: number | string | (number | string)[] | (number | string)[][]) => string[]
  
  types?: {QUERY: "query", RESOURCE: "resource", EXTERNAL: "external", REQUEST: "request"}
  
  <T>(type: string, namespace: string, key: string, value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T>
  
  <T>(type: string, namespace: string, key: string | string[], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<(T | Response.error)[]>
}

interface iCacheStore {
  [type: string]: {
    [namespace: string]: {
      [key: string]: iCacheObject
    }
  }
}

interface iCacheObject {
  value?: any
  promise?: Promise<any>
  timeout?: iCacheTimer
}

interface iCacheOptions {
  timeout?: number
}

interface iGetNamespaceOptions {
  promise?: boolean
  value?: boolean
  timeout?: boolean
}

interface iCacheTimer extends NodeJS.Timer {
  refresh: () => void
}

