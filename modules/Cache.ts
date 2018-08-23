import * as Promise from "bluebird";
import * as _ from "lodash";
import * as Response from "./Response";

const Cache: iCache = Default;
const __store: iCacheStore = {};
const __config: iCacheOptions = {
  timeout: 30000
};

function Default<T>(type: string, namespace: string, key: Key[], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T | (T | Response.error)[]> {
  return value ? Cache.setAny(type, namespace, key, value, options) : Cache.getAny(type, namespace, key);
}

/**
 * Attempt to retrieve a value from the cache tied to a type, namespace and the first key in a list of keys.
 * If a cache hit occurs, this function either returns a pending promise to be resolved that updates the cache value or the cache value if none is pending.
 * If a cache miss occurs, this function returns a rejection with value null.
 */

function cacheGet<T>(type: string, namespace: string, keys: Key[]): Promise<(T | Response.error)[]> {
  return Promise.map<Key, (T | Response.error)>(keys, key => {
    const object = _.get(__store, [type, namespace, key]);
    if (!object) { return Promise.reject(new Response.error(404, "cache", {type: type, namespace: namespace, keys: key})); }
    if (object.promise) { return object.promise; }
    if (object.timeout && object.timeout) { object.timeout.refresh(); }
    if (object.value) { return object.value; }
    return Promise.reject(new Response.error(500, "cache", {type: type, namespace: namespace, keys: keys}));
  })
  .then(values => {
    if (_.every(values, value => value instanceof Error)) { throw new Response.error(404, "cache", _.map(values, "content")); }
    return Promise.resolve(values);
  });
}

Cache.get = cacheGet;

function cacheGetOne<T>(type: string, namespace: string, key: Key): Promise<T> {
  const object = _.get(__store, [type, namespace, key], {});
  if (object.promise) { return object.promise; }
  if (object.timeout) { object.timeout.refresh(); }
  if (object.value) { return Promise.resolve(object.value); }
  return Promise.reject(new Response.error(404, "cache", {type: type, namespace: namespace, keys: key}));
}

Cache.getOne = cacheGetOne;

function cacheGetAny<T>(type: string, namespace, keys: Key[]): Promise<T> {
  return Promise.any(_.map(keys, key => {
    const object = _.get(__store, [type, namespace, key]);
    if (!object) { return Promise.reject(new Response.error(404, "cache", {type: type, namespace: namespace, keys: key})); }
    if (object.promise) { return object.promise; }
    if (object.timeout && object.timeout) { object.timeout.refresh(); }
    if (object.value) { return object.value; }
    return Promise.reject(new Response.error(500, "cache", {type: type, namespace: namespace, keys: keys}));
  }))
  .catch(err => {
    if (_.every(err, e => e.code === 404 && e.type === "cache")) { throw new Response.error(404, "cache", _.map(err, "content")); }
    const t_error = _.find(err, e => !e.code && !e.type);
    if (t_error) { throw new Response.error(500, "cache", t_error); }
    throw new Response.error(500, "cache", err);
  });
}

Cache.getAny = cacheGetAny;

function cacheSet<T>(type: string, namespace: string, keys: Key[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> {
  if (_.some(keys, key => _.get(__store, [type, namespace, key, "promise"]))) {
    return Promise.reject(new Response.error(409, "cache", _.filter(_.map(keys, k => _.get(__store, [type, namespace, k, "promise"]) ? k : null))));
  }
  const promise = typeof value === "function" ? value() : Promise.resolve(value);
  _.each(keys, key => _.set(__store, [type, namespace, key, "promise"], promise));
  return promise.tap(res => {
    _.each(keys, key => {
      _.unset(__store, [type, namespace, key, "promise"]);
      _.setWith(__store, [type, namespace, key], {
        value:   res,
        timeout: Cache.unsetAfter(type, namespace, key, _.get(options, "timeout"))
      }, Object);
    });
  });
}

Cache.set = cacheSet;

function cacheSetOne<T>(type: string, namespace: string, key: Key, value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> {
  if (_.get(__store, [type, namespace, key, "promise"])) { return Promise.reject(new Response.error(409, "cache", {type: type, namespace: namespace, key: key})); }
  const promise = typeof value === "function" ? value() : Promise.resolve(value);
  _.set(__store, [type, namespace, key, "promise"], promise);
  return promise.tap(res => {
    _.unset(__store, [type, namespace, key, "promise"]);
    _.setWith(__store, [type, namespace, key], {
      value:   res,
      timeout: Cache.unsetAfter(type, namespace, key, _.get(options, "timeout"))
    }, Object);
  });
}

Cache.setOne = cacheSetOne;

function cacheSetAny<T>(type: string, namespace: string, keys: Key[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> {
  if (_.every(keys, key => _.get(__store, [type, namespace, key, "promise"]))) { return Promise.reject(new Response.error(409, "cache", {type: type, namespace: namespace, key: keys})); }
  const promise = typeof value === "function" ? value() : Promise.resolve(value);
  const sets = _.filter(_.map(keys, key => !_.get(__store, [type, namespace, key, "promise"]) ? key : null));
  _.each(keys, key => _.set(__store, [type, namespace, key, "promise"], promise));
  return promise.tap(res => {
    _.each(keys, key => {
      _.unset(__store, [type, namespace, key, "promise"]);
      _.setWith(__store, [type, namespace, key], {
        value:   res,
        timeout: Cache.unsetAfter(type, namespace, key, _.get(options, "timeout"))
      }, Object);
    });
  });
}

Cache.setAny = cacheSetAny;

function cacheUnset(type: string, namespace: string, keys: Key[]) {
  _.each(keys, key => {
    const current: iCacheObject = _.get(__store, [type, namespace, key], {});
    if (current.timeout) { clearInterval(current.timeout); }
    _.unset(__store, [type, namespace, key]);
  });
}

Cache.unset = cacheUnset;

function cacheUnsetOne(type: string, namespace: string, key: Key) {
  const current: iCacheObject = _.get(__store, [type, namespace, key], {});
  if (current.timeout) { clearInterval(current.timeout); }
  _.unset(__store, [type, namespace, key]);
}

Cache.unsetOne = cacheUnsetOne;

function cacheUnsetAfter(type: string, namespace: string, key: Key, milliseconds: number): iCacheTimer {
  if (milliseconds === null) { return null; }
  if (milliseconds === 0) {
    _.unset(__store, [type, namespace, key]);
    return undefined;
  }
  return <iCacheTimer>setTimeout(() => _.unset(__store, [type, namespace, key]), milliseconds || __config.timeout);
}

Cache.unsetAfter = cacheUnsetAfter;

/**
 * Helper method to create a timeout that will remove a value from the cache after a set amount of milliseconds.
 *
 * @param type          The data type of the value.
 * @param namespace     The namespace that the value populates.
 * @param key           The key which the value occupies.
 * @param milliseconds  How many milliseconds the value should exist for before deletion if not refreshed. Null creates no timeout, 0 means immediately (synchronous), and any other value means asynchronous.
 */

/**
 * Helper method to generate a set of key strings from a given set of keys.
 *
 * @param bits    Single set of symbols, array of sets of symbols or two-dimensional array of sets of symbols.
 */

function cacheToKey(bits: Key[]): string {
  return _.join(bits, "::");
}

Cache.toKey = cacheToKey;

function cacheToKeys(bits: Key[][]): string[] {
  return _.map(bits, bit => _.join(bit, "::"));
}

Cache.toKeys = cacheToKeys;

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
  set?: <T>(type: string, namespace: string, key: Key[], value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  get?: <T>(type: string, namespace: string, key: Key[]) => Promise<(T | Response.error)[]>
  
  setOne?: <T>(type: string, namespace: string, key: Key, value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  getOne?: <T>(type: string, namespace: string, key: Key) => Promise<T>
  
  setAny?: <T>(type: string, namespace: string, key: Key[], value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  getAny?: <T>(type: string, namespace: string, key: Key[]) => Promise<T>
  
  unset?: (type: string, namespace: string, key: Key[]) => void
  unsetOne?: (type: string, namespace: string, key: Key) => void
  unsetAfter?: (type: string, namespace: string, key: Key, milliseconds: number) => iCacheTimer
  
  toKey?: (keys: Key[]) => string
  toKeys?: (keys: Key[][]) => string[]
  
  getNamespace?: (type: string, namespace: string, options?: iGetNamespaceOptions) => {[key: string]: iCacheObject};
  
  types?: {QUERY: "query", RESOURCE: "resource", EXTERNAL: "external", REQUEST: "request"}
  
  <T>(type: string, namespace: string, key: Key[], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<(T | Response.error)[]>
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

type Key = number | string;

