import * as Promise from "bluebird";
import * as _ from "lodash";
import {eCacheTypes, iCacheFn, iCacheObject, iCacheOptions, iCacheService, iCacheTimer, tCacheArgumentsObject, tCacheConfig, tCacheKey, tCacheReturnPromise, tCacheReturnPromiseMix, tCacheReturnPromiseSet, tCacheStore, tCacheValue} from "../interfaces/iCache";
import * as Response from "./Response";

const Service: iCacheFn = Default;
const store: tCacheStore = {};
const config: tCacheConfig = {timeout: 30000};

function Default<T>(type: eCacheTypes, namespace: string, key: string[], value: tCacheValue<T>, options?: iCacheOptions): tCacheReturnPromiseMix<T> {
  return value ? setAny(type, namespace, key, value, options) : getAny(type, namespace, key);
}

function get<T>(type: eCacheTypes, namespace: string, keys: tCacheKey[]): tCacheReturnPromiseSet<T> {
  return Promise.map<tCacheKey, (T | Error)>(keys, key => {
    const object: iCacheObject = _.get(store, [type, namespace, key]);
    if (!object) { return Promise.reject(Response.error(404, "cache", {type: type, namespace: namespace, keys: key})); }
    if (object.promise) { return object.promise; }
    if (object.timeout && object.timeout) { object.timeout.refresh(); }
    if (object.value) { return object.value; }
    return Promise.reject(Response.error(500, "cache", {type: type, namespace: namespace, keys: keys}));
  })
  .then(values => {
    if (_.every(values, value => value instanceof Error)) { throw Response.error(404, "cache", _.map(values, "content")); }
    return Promise.resolve(values);
  });
}

function getOne<T>(type: eCacheTypes, namespace: string, key: tCacheKey): Promise<T> {
  const object: iCacheObject = _.get(store, [type, namespace, key], {});
  if (object.promise) { return object.promise; }
  if (object.timeout) { object.timeout.refresh(); }
  if (object.value) { return Promise.resolve(object.value); }
  return Promise.reject(Response.error(404, "cache", {type: type, namespace: namespace, keys: key}));
}

function getAny<T>(type: eCacheTypes, namespace: string, keys: tCacheKey[]): Promise<T> {
  return Promise.any(_.map(keys, key => {
    const object: iCacheObject = _.get(store, [type, namespace, key]);
    if (!object) { return Promise.reject(Response.error(404, "cache", {type: type, namespace: namespace, keys: key})); }
    if (object.promise) { return object.promise; }
    if (object.timeout && object.timeout) { object.timeout.refresh(); }
    if (object.value) { return object.value; }
    return Promise.reject(Response.error(500, "cache", {type: type, namespace: namespace, keys: keys}));
  }))
  .catch(err => {
    if (_.every(_.initial(_.values(err)), e => e.code === 404)) { throw Response.error(404, "cache", _.map(err, "content")); }
    const t_error = _.find(err, e => !e.code && !e.type);
    if (t_error) { throw Response.error(500, "cache", t_error); }
    throw Response.error(500, "cache", err);
  });
}

function handleSetPromise<T>(type: eCacheTypes, namespace: string, keys: tCacheKey | tCacheKey[], promise: Promise<T>, options: iCacheOptions): tCacheReturnPromise<T> {
  return promise
  .finally(() => {
    _.each(_.concat(keys), key => {
      _.unset(store, [type, namespace, key]);
    });
  })
  .tap(res => {
    _.each(_.concat(keys), key => {
      if (_.get(options, "timeout") !== 0) {
        _.setWith(store, [type, namespace, key], {
          value:   res,
          timeout: unsetAfter(type, namespace, key, _.get(options, "timeout"))
        }, Object);
      }
    });
  });
}

function set<T>(type: eCacheTypes, namespace: string, keys: tCacheKey[], value: tCacheValue<T>, options: iCacheOptions = {}): tCacheReturnPromise<T> {
  if (_.some(keys, key => _.get(store, [type, namespace, key, "promise"]))) {
    if (options && options.collision_fallback) { return options.collision_fallback !== true ? options.collision_fallback() : getAny(type, namespace, keys); }
    return Promise.reject(Response.error(409, "cache", _.filter(_.map(keys, k => _.get(store, [type, namespace, k, "promise"]) ? k : null))));
  }
  const promise = typeof value === "function" ? value() : Promise.resolve(value);
  _.each(keys, key => _.set(store, [type, namespace, key, "promise"], promise));
  return handleSetPromise(type, namespace, keys, promise, options);
}

function setOne<T>(type: eCacheTypes, namespace: string, key: tCacheKey, value: tCacheValue<T>, options: iCacheOptions = {}): tCacheReturnPromise<T> {
  if (_.get(store, [type, namespace, key, "promise"])) {
    if (options && options.collision_fallback) { return options.collision_fallback !== true ? options.collision_fallback() : getOne(type, namespace, key); }
    return Promise.reject(Response.error(409, "cache", {type: type, namespace: namespace, key: key}));
  }
  const promise = typeof value === "function" ? value() : Promise.resolve(value);
  _.set(store, [type, namespace, key, "promise"], promise);
  return handleSetPromise(type, namespace, key, promise, options);
}

function setAny<T>(type: eCacheTypes, namespace: string, keys: tCacheKey[], value: tCacheValue<T>, options: iCacheOptions = {}): tCacheReturnPromise<T> {
  if (_.every(keys, key => _.get(store, [type, namespace, key, "promise"]))) {
    if (options && options.collision_fallback) { return options.collision_fallback !== true ? options.collision_fallback() : getAny(type, namespace, keys); }
    return Promise.reject(Response.error(409, "cache", {type: type, namespace: namespace, key: keys}));
  }
  const promise = typeof value === "function" ? value() : Promise.resolve(value);
  const sets = _.filter(_.map(keys, key => !_.get(store, [type, namespace, key, "promise"]) ? key : null));
  _.each(keys, key => _.set(store, [type, namespace, key, "promise"], promise));
  return handleSetPromise(type, namespace, sets, promise, options);
}

function setOr<T>(setter: tCacheArgumentsObject<T>, ...next: tCacheArgumentsObject<T>[]): Promise<T> {
  return (_.isArray(setter.keys) ? set.apply(Service, _.values(setter)) : setOne.apply(Service, _.values(setter)))
  .catch(err => next.length === 0 ? Promise.reject(err) : setOr.apply(Service, next));
}

function unset(type: eCacheTypes, namespace: string, keys: tCacheKey[]): void {
  _.each(keys, key => {
    const current: iCacheObject = _.get(store, [type, namespace, key], {});
    if (current.timeout) { clearInterval(current.timeout); }
    _.unset(store, [type, namespace, key]);
  });
}

function unsetOne(type: eCacheTypes, namespace: string, key: tCacheKey): void {
  const current: iCacheObject = _.get(store, [type, namespace, key], {});
  if (current.timeout) { clearInterval(current.timeout); }
  _.unset(store, [type, namespace, key]);
}

function unsetAfter(type: eCacheTypes, namespace: string, key: tCacheKey, milliseconds: number): iCacheTimer {
  return milliseconds === null ? null : <iCacheTimer>setTimeout(() => _.unset(store, [type, namespace, key]), milliseconds || config.timeout);
}

function getNamespace(type: eCacheTypes, namespace: string, options?: iCacheOptions): {[key: string]: iCacheObject} {
  return _.mapValues(<{[key: string]: iCacheObject}>_.get(store, [type, namespace]), value => _.pickBy(value, (v, key) => options[key]));
}

function keyFromSet(parts: (string | number)[]): string {
  return _.join(parts, "::");
}

function keysFromSets(parts: (string | number)[][]): string[] {
  return _.map(parts, part => _.join(part, "::"));
}

const exported: iCacheService = _.assign(
  Service,
  {
    types:        eCacheTypes,
    get:          get,
    getOne:       getOne,
    getAny:       getAny,
    set:          set,
    setOne:       setOne,
    setAny:       setAny,
    setOr:        setOr,
    unset:        unset,
    unsetOne:     unsetOne,
    unsetAfter:   unsetAfter,
    getNamespace: getNamespace,
    keyFromSet:   keyFromSet,
    keysFromSets: keysFromSets
  }
);

export = exported;

//
// const Cache: iCache = Default;
// const __store: iCacheStore = {};
// const __config: iCacheOptions = {
//   timeout: 30000
// };
//
// function Default<T>(type: string, namespace: string, key: Key[], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T | (T | Response.error)[]> {
//   return value ? Cache.setAny(type, namespace, key, value, options) : Cache.getAny(type, namespace, key);
// }
//
// /**
//  * Attempt to retrieve a value from the cache tied to a type, namespace and the first key in a list of keys.
//  * If a cache hit occurs, this function either returns a pending promise to be resolved that updates the cache value or the cache value if none is pending.
//  * If a cache miss occurs, this function returns a rejection with value null.
//  */
//
// function cacheGet<T>(type: string, namespace: string, keys: Key[]): Promise<(T | Response.error)[]> {
//   return Promise.map<Key, (T | Response.error)>(keys, key => {
//     const object = _.get(__store, [type, namespace, key]);
//     if (!object) { return Promise.reject(Response.error(404, "cache", {type: type, namespace: namespace, keys: key})); }
//     if (object.promise) { return object.promise; }
//     if (object.timeout && object.timeout) { object.timeout.refresh(); }
//     if (object.value) { return object.value; }
//     return Promise.reject(Response.error(500, "cache", {type: type, namespace: namespace, keys: keys}));
//   })
//   .then(values => {
//     if (_.every(values, value => <Response.error>value instanceof Error)) { throw Response.error(404, "cache", _.map(values, "content")); }
//     return Promise.resolve(values);
//   });
// }
//
// Cache.get = cacheGet;
//
// function cacheGetOne<T>(type: string, namespace: string, key: Key): Promise<T> {
//   const object = _.get(__store, [type, namespace, key], {});
//   if (object.promise) { return object.promise; }
//   if (object.timeout) { object.timeout.refresh(); }
//   if (object.value) { return Promise.resolve(object.value); }
//   return Promise.reject(Response.error(404, "cache", {type: type, namespace: namespace, keys: key}));
// }
//
// Cache.getOne = cacheGetOne;
//
// function cacheGetAny<T>(type: string, namespace: string, keys: Key[]): Promise<T> {
//   return Promise.any(_.map(keys, key => {
//     const object = _.get(__store, [type, namespace, key]);
//     if (!object) { return Promise.reject(Response.error(404, "cache", {type: type, namespace: namespace, keys: key})); }
//     if (object.promise) { return object.promise; }
//     if (object.timeout && object.timeout) { object.timeout.refresh(); }
//     if (object.value) { return object.value; }
//     return Promise.reject(Response.error(500, "cache", {type: type, namespace: namespace, keys: keys}));
//   }))
//   .catch(err => {
//     if (_.every(_.initial(_.values(err)), e => e.code === 404)) { throw Response.error(404, "cache", _.map(err, "content")); }
//     const t_error = _.find(err, e => !e.code && !e.type);
//     if (t_error) { throw Response.error(500, "cache", t_error); }
//     throw Response.error(500, "cache", err);
//   });
// }
//
// Cache.getAny = cacheGetAny;
//
// function handleSetPromise<T>(type: string, namespace: string, keys: Key | Key[], promise: Promise<T>, options: iCacheSetOptions): Promise<T> {
//   return promise
//   .finally(() => {
//     _.each(_.concat(keys), key => {
//       _.unset(__store, [type, namespace, key]);
//     });
//   })
//   .tap(res => {
//     _.each(_.concat(keys), key => {
//       if (_.get(options, "timeout") !== 0) {
//         _.setWith(__store, [type, namespace, key], {
//           value:   res,
//           timeout: Cache.unsetAfter(type, namespace, key, _.get(options, "timeout"))
//         }, Object);
//       }
//     });
//   });
// }
//
// function cacheSet<T>(type: string, namespace: string, keys: Key[], value: T | (() => Promise<T>), options: iCacheSetOptions = {}): Promise<T> {
//   if (_.some(keys, key => _.get(__store, [type, namespace, key, "promise"]))) {
//     if (options && options.collision_fallback) { return options.collision_fallback !== true ? options.collision_fallback() : Cache.getAny(type, namespace, keys); }
//     return Promise.reject(Response.error(409, "cache", _.filter(_.map(keys, k => _.get(__store, [type, namespace, k, "promise"]) ? k : null))));
//   }
//   const promise = typeof value === "function" ? value() : Promise.resolve(value);
//   _.each(keys, key => _.set(__store, [type, namespace, key, "promise"], promise));
//   return handleSetPromise(type, namespace, keys, promise, options);
// }
//
// Cache.set = cacheSet;
//
// function cacheSetOne<T>(type: string, namespace: string, key: Key, value: T | (() => Promise<T>), options: iCacheSetOptions = {}): Promise<T> {
//   if (_.get(__store, [type, namespace, key, "promise"])) {
//     if (options && options.collision_fallback) { return options.collision_fallback !== true ? options.collision_fallback() : Cache.getOne(type, namespace, key); }
//     return Promise.reject(Response.error(409, "cache", {type: type, namespace: namespace, key: key}));
//   }
//   const promise = typeof value === "function" ? value() : Promise.resolve(value);
//   _.set(__store, [type, namespace, key, "promise"], promise);
//   return handleSetPromise(type, namespace, key, promise, options);
// }
//
// Cache.setOne = cacheSetOne;
//
// function cacheSetAny<T>(type: string, namespace: string, keys: Key[], value: T | (() => Promise<T>), options: iCacheSetOptions = {}): Promise<T> {
//   if (_.every(keys, key => _.get(__store, [type, namespace, key, "promise"]))) {
//     if (options && options.collision_fallback) { return options.collision_fallback !== true ? options.collision_fallback() : Cache.getAny(type, namespace, keys); }
//     return Promise.reject(Response.error(409, "cache", {type: type, namespace: namespace, key: keys}));
//   }
//   const promise = typeof value === "function" ? value() : Promise.resolve(value);
//   const sets = _.filter(_.map(keys, key => !_.get(__store, [type, namespace, key, "promise"]) ? key : null));
//   _.each(keys, key => _.set(__store, [type, namespace, key, "promise"], promise));
//   return handleSetPromise(type, namespace, sets, promise, options);
// }
//
// Cache.setAny = cacheSetAny;
//
// function cacheSetOr<T>(setter: cacheOrObject<T>, ...next: cacheOrObject<T>[]): Promise<T> {
//   return (_.isArray(setter.keys) ? Cache.set.apply(Cache, _.values(setter)) : Cache.setOne.apply(Cache, _.values(setter)))
//   .catch(err => next.length === 0 ? Promise.reject(err) : cacheSetOr.apply(Cache, next));
// }
//
// Cache.setOr = cacheSetOr;
//
// function cacheUnset(type: string, namespace: string, keys: Key[]) {
//   _.each(keys, key => {
//     const current: iCacheObject = _.get(__store, [type, namespace, key], {});
//     if (current.timeout) { clearInterval(current.timeout); }
//     _.unset(__store, [type, namespace, key]);
//   });
// }
//
// Cache.unset = cacheUnset;
//
// function cacheUnsetOne(type: string, namespace: string, key: Key) {
//   const current: iCacheObject = _.get(__store, [type, namespace, key], {});
//   if (current.timeout) { clearInterval(current.timeout); }
//   _.unset(__store, [type, namespace, key]);
// }
//
// Cache.unsetOne = cacheUnsetOne;
//
// function cacheUnsetAfter(type: string, namespace: string, key: Key, milliseconds: number): iCacheTimer {
//   return milliseconds === null ? null : <iCacheTimer>setTimeout(() => _.unset(__store, [type, namespace, key]), milliseconds || __config.timeout);
// }
//
// Cache.unsetAfter = cacheUnsetAfter;
//
// /**
//  * Helper method to create a timeout that will remove a value from the cache after a set amount of milliseconds.
//  *
//  * @param type          The data type of the value.
//  * @param namespace     The namespace that the value populates.
//  * @param key           The key which the value occupies.
//  * @param milliseconds  How many milliseconds the value should exist for before deletion if not refreshed. Null creates no timeout, 0 means immediately (synchronous), and any other value means asynchronous.
//  */
//
// /**
//  * Helper method to generate a set of key strings from a given set of keys.
//  *
//  * @param bits    Single set of symbols, array of sets of symbols or two-dimensional array of sets of symbols.
//  */
//
// function cacheToKey(bits: Key[]): string {
//   return _.join(bits, "::");
// }
//
// Cache.toKey = cacheToKey;
//
// function cacheToKeys(bits: Key[][]): string[] {
//   return _.map(bits, bit => _.join(bit, "::"));
// }
//
// Cache.toKeys = cacheToKeys;
//
// /**
//  * Helper method to get the values, promises and/or timeouts from a specific namespace.
//  *
//  * @param type        The data type related to the namespace.
//  * @param namespace   The namespace to get values from.
//  * @param options     Options to choose if values, promises and/timeouts should be shown.
//  */
//
// function cacheGetNamespace(type: string, namespace: string, options: iGetNamespaceOptions = {promise: true, value: true}): {[key: string]: iCacheObject} {
//   return _.mapValues(<{[key: string]: iCacheObject}>_.get(__store, [type, namespace]), value => _.pickBy(value, (v, key) => options[key]));
// }
//
// Cache.getNamespace = cacheGetNamespace;
//
// Cache.types = {
//   QUERY:    "query",
//   RESOURCE: "resource",
//   EXTERNAL: "external",
//   REQUEST:  "request",
//   VALIDATE: "validate",
//   SAVE: "save"
// };
//
// export = Cache;
//
// interface iCache {
//   set?: <T>(type: string, namespace: string, key: Key[], value: T | (() => Promise<T>), options?: iCacheSetOptions) => Promise<T>
//   get?: <T>(type: string, namespace: string, key: Key[]) => Promise<(T | Response.error)[]>
//
//   setOne?: <T>(type: string, namespace: string, key: Key, value: T | (() => Promise<T>), options?: iCacheSetOptions) => Promise<T>
//   getOne?: <T>(type: string, namespace: string, key: Key) => Promise<T>
//
//   setAny?: <T>(type: string, namespace: string, key: Key[], value: T | (() => Promise<T>), options?: iCacheSetOptions) => Promise<T>
//   getAny?: <T>(type: string, namespace: string, key: Key[]) => Promise<T>
//
//   setOr?: <T>(setter: cacheOrObject<T>, ...next: cacheOrObject<T>[]) => Promise<T>
//
//   unset?: (type: string, namespace: string, key: Key[]) => void
//   unsetOne?: (type: string, namespace: string, key: Key) => void
//   unsetAfter?: (type: string, namespace: string, key: Key, milliseconds: number) => iCacheTimer
//
//   toKey?: (keys: Key[]) => string
//   toKeys?: (keys: Key[][]) => string[]
//
//   getNamespace?: (type: string, namespace: string, options?: iGetNamespaceOptions) => {[key: string]: iCacheObject};
//
//   types?: {VALIDATE: "validate", SAVE: "save", "QUERY": "query", RESOURCE: "resource", EXTERNAL: "external", REQUEST: "request"}
//
//   <T>(type: string, namespace: string, key: Key[], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T | (T | Response.error)[]>
// }
//
// interface iCacheStore {
//   [type: string]: {
//     [namespace: string]: {
//       [key: string]: iCacheObject
//     }
//   }
// }
//
// interface iCacheObject {
//   value?: any
//   promise?: Promise<any>
//   timeout?: iCacheTimer
// }
//
// interface iCacheOptions {
//   timeout?: number
// }
//
// interface iCacheSetOptions extends iCacheOptions {
//   collision_fallback?: boolean | (() => Promise<any>)
// }
//
// interface iGetNamespaceOptions {
//   promise?: boolean
//   value?: boolean
//   timeout?: boolean
// }
//
// interface iCacheTimer extends NodeJS.Timer {
//   refresh: () => void
// }
//
// type Key = number | string;
// type cacheOrObject<T> = {type: string, namespace: string, keys: Key | Key[], promise: () => Promise<T>, options?: iCacheSetOptions};
