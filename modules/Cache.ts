import * as Promise from "bluebird";
import * as _ from "lodash";
import * as Response from "./Response";

const Cache: iCache = Default;
const __store: iCacheStore = {};
const __config: iCacheOptions = {
  timeout: 30000
};

function Default<T>(type: string, namespace: string, key: Key | Key[] | Key[][], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T | Promise.Inspection<T>[]> {
  return value ? Cache.set(type, namespace, key, value, options) : Cache.get(type, namespace, key);
}

/**
 * Attempt to retrieve a value from the cache tied to a type, namespace and the first key in a list of keys.
 * If a cache hit occurs, this function either returns a pending promise to be resolved that updates the cache value or the cache value if none is pending.
 * If a cache miss occurs, this function returns a rejection with value null.
 */

function cacheGet<T>(type: string, namespace: string, key: Key | Key[]): Promise<T>
function cacheGet<T>(type: string, namespace: string, key: Key | Key[] | Key[][]): Promise<Promise.Inspection<T>[]>
function cacheGet<T>(type: string, namespace: string, key: Key | Key[] | Key[][]): Promise<T | Promise.Inspection<T>[]> {
  const keys = Cache.getKeyStrings(key);
  
  if (keys.length === 1) {
    return handleGetPromise<T>(_.get(__store, [type, namespace, keys[0]], {}));
  }
  return Promise.all(_.map(keys, key => handleGetPromise<T>(_.get(__store, [type, namespace, key], {})).reflect()));
}

function handleGetPromise<T>(object: iCacheObject): Promise<T> {
  if (object.timeout) { object.timeout.refresh(); }
  if (object.promise) { return object.promise; }
  return object.value ? Promise.resolve(object.value) : Promise.reject(null);
}

Cache.get = cacheGet;

function cacheSet<T>(type: string, namespace: string, key: Key | Key[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T>
function cacheSet<T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<(T | Error)[]>
function cacheSet<T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T | (T | Error)[]> {
  const keys: string[] = Cache.getKeyStrings(key);
  if (keys.length === 1) { return handleSetPromise(type, namespace, keys[0], value, options); }
  
  if (_.some(keys, key => _.get(__store, [type, namespace, key, "promise"]))) {
    return Promise.all(_.map(keys, key => Promise.reject(_.get(__store, [type, namespace, key, "promise"]) ? key : null).reflect()))
    .map(res => new Response.error(500, "transaction", res.isFulfilled() ? res.value() : res.reason()));
  }
  
  return Promise.all(_.map(keys, key => handleSetPromise(type, namespace, key, value, options).reflect()))
  .map(res => res.isFulfilled() ? res.value() : res.reason());
}

function handleSetPromise<T>(type: string, namespace: string, key: string, value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> {
  const object: iCacheObject = _.get(__store, [type, namespace, key], {});
  
  if (object.timeout) { object.timeout.refresh(); }
  if (object.promise) { return Promise.reject(new Response.error(500, "transaction", key)); }
  
  const promise: Promise<T> = typeof value === "function" ? value() : Promise.resolve(value);
  _.setWith(__store, [type, namespace, key, "promise"], promise, Object);
  
  return promise
  .then(res => {
    _.unset(__store, [type, namespace, key, "promise"]);
    _.setWith(__store, [type, namespace, key, "value"], res, Object);
    return res;
  })
  .finally(() => _.setWith(__store, [type, namespace, key, "timeout"], Cache.getTimeout(type, namespace, key, _.get(options, "timeout")), Object));
}

Cache.set = cacheSet;

function cacheTry<T>(type: string, namespace: string, key: Key | Key[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T>
function cacheTry<T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<Promise.Inspection<T>[]>
function cacheTry<T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T | Promise.Inspection<T>[]> {
  const keys = Cache.getKeyStrings(key);
  
  if (keys.length === 1) {
    return <Promise<T>>Cache.get<T>(type, namespace, keys[0])
    .catch(err => err ? Promise.reject(err) : Cache.set(type, namespace, keys[0], value, options));
  }
  return Cache.get(type, namespace, key)
  .map((res, i) => {
    if (res.isFulfilled()) { return res.value(); }
    if (res.isRejected() && res.reason() !== null) { return res.reason(); }
    if (_.get(__store, [type, namespace, keys[i], "promise"])) { return Cache.get(type, namespace, keys[i]); }
    return Cache.set(type, namespace, keys[i], value, options);
  });
}

Cache.try = cacheTry;

Cache.unset = (type: string, namespace: string, key: Key | Key[] | Key[][]) => {
  const keys: string[] = Cache.getKeyStrings(key);
  _.each(keys, key => {
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
  if (_.isUndefined(milliseconds)) { return _.get(__store, [type, namespace, key]); }
  if (milliseconds === null) { return null; }
  if (milliseconds === 0) {
    _.unset(__store, [type, namespace, key]);
    return undefined;
  }
  return <iCacheTimer>setTimeout(() => _.unset(__store, [type, namespace, key]), milliseconds || __config.timeout);
}

Cache.getTimeout = cacheGetTimeout;

function cacheGetKeyStrings(keys: Key | Key[] | Key[][]): string[] {
  if (_.isArray(keys)) {
    if (_.every(keys, key => _.isArray(key))) {
      return _.uniq(_.map(<(string | number | symbol)[][]>keys, key => _.join(key, "::")));
    }
    return [_.join(keys, "::")];
  }
  return [`${keys}`];
}

Cache.getKeyStrings = cacheGetKeyStrings;

function cacheGetNamespace(type: string, namespace: string, options: iGetNamespaceOptions = {promise: true, value: true}): {[key: string]: iCacheObject} {
  return _.mapValues(_.get(__store, [type, namespace]), value => _.omitBy(value, (v, key) => options[key]));
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
    <T>(type: string, namespace: string, key: Key | Key[]): Promise<T>
    <T>(type: string, namespace: string, key: Key | Key[] | Key[][]): Promise<Promise.Inspection<T>[]>
  }
  set?: {
    <T>(type: string, namespace: string, key: Key | Key[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T>
    <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<Promise.Inspection<T>[]>
  }
  try?: {
    <T>(type: string, namespace: string, key: Key | Key[], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T>
    <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<Promise.Inspection<T>[]>
  }
  unset?: (type: string, namespace: string, key: Key | Key[] | Key[][]) => void
  
  getNamespace?: (type: string, namespace: string) => {[key: string]: iCacheObject};
  getTimeout?: (type: string, namespace: string, key: string, milliseconds?: number) => NodeJS.Timer
  getKeyStrings?: (keys: Key | Key[] | Key[][]) => string[]
  
  types?: {QUERY: "query", RESOURCE: "resource", EXTERNAL: "external", REQUEST: "request"}
  
  <T>(type: string, namespace: string, key: Key | Key[], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T>
  
  <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T[]>
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

type Key = string | number;
