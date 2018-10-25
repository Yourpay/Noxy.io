import * as Promise from "bluebird";
import * as _ from "lodash";
import {eCacheTypes, iCacheFn, iCacheObject, iCacheOptions, iCacheService, tCacheArgumentsObject, tCacheConfig, tCacheKey, tCacheReturnPromise, tCacheReturnPromiseMix, tCacheReturnPromiseSet, tCacheStore, tCacheValue} from "../interfaces/iCache";
import * as Response from "./Response";

const Service: iCacheFn = Default;
const store: tCacheStore = {};
const config: tCacheConfig = {timeout: 30000};

function Default<T>(type: eCacheTypes, namespace: string, key: string[], value: tCacheValue<T>, options?: iCacheOptions): tCacheReturnPromiseMix<T> {
  return value ? setAny(type, namespace, key, value, options) : getAny(type, namespace, key);
}

/**
 * Attempt to retrieve a value from the cache tied to a type, namespace and the first key in a list of keys.
 * If a cache hit occurs, this function either returns a pending promise to be resolved that updates the cache value or the cache value if none is pending.
 * If a cache miss occurs, this function returns a rejection with value null.
 */

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
    if (_.every(values, value => value instanceof Error)) { Promise.reject(Response.error(404, "cache", _.map(values, "content"))); }
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
    if (_.every(_.initial(_.values(err)), e => e.code === 404)) { return Promise.reject(Response.error(404, "cache", _.map(err, "content"))); }
    const t_error = _.find(err, e => !e.code && !e.type);
    if (t_error) { return Promise.reject(Response.error(500, "cache", t_error)); }
    return Promise.reject(Response.error(500, "cache", err));
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
  const promise = typeof value === "function" ? (<Function>value)() : Promise.resolve(value);
  _.each(keys, key => _.set(store, [type, namespace, key, "promise"], promise));
  return handleSetPromise(type, namespace, keys, promise, options);
}

function setOne<T>(type: eCacheTypes, namespace: string, key: tCacheKey, value: tCacheValue<T>, options: iCacheOptions = {}): tCacheReturnPromise<T> {
  if (_.get(store, [type, namespace, key, "promise"])) {
    if (options && options.collision_fallback) { return options.collision_fallback !== true ? options.collision_fallback() : getOne(type, namespace, key); }
    return Promise.reject(Response.error(409, "cache", {type: type, namespace: namespace, key: key}));
  }
  const promise = typeof value === "function" ? (<Function>value)() : Promise.resolve(value);
  _.set(store, [type, namespace, key, "promise"], promise);
  return handleSetPromise(type, namespace, key, promise, options);
}

function setAny<T>(type: eCacheTypes, namespace: string, keys: tCacheKey[], value: tCacheValue<T>, options: iCacheOptions = {}): tCacheReturnPromise<T> {
  if (_.every(keys, key => _.get(store, [type, namespace, key, "promise"]))) {
    if (options && options.collision_fallback) { return options.collision_fallback !== true ? options.collision_fallback() : getAny(type, namespace, keys); }
    return Promise.reject(Response.error(409, "cache", {type: type, namespace: namespace, key: keys}));
  }
  const promise = typeof value === "function" ? (<Function>value)() : Promise.resolve(value);
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

function unsetAfter(type: eCacheTypes, namespace: string, key: tCacheKey, milliseconds: number): NodeJS.Timer {
  return milliseconds === null ? null : setTimeout(() => _.unset(store, [type, namespace, key]), milliseconds || config.timeout);
}

/**
 * Helper method to generate a set of key strings from a given set of keys.
 *
 * @param parts    Single set of symbols, array of sets of symbols or two-dimensional array of sets of symbols.
 */

function keyFromSet(parts: (string | number)[]): string {
  return _.join(_.map(_.filter(parts, part => +part === 0 || part === "" || part), part => _.snakeCase(_.toLower(_.toString(part).replace(/^\s+|\s+$/, "")))), "::");
}

function keysFromSets(parts: (string | number)[][]): string[] {
  return _.map(parts, part => keyFromSet(part));
}

const exported: iCacheService = _.assign(
  Service,
  {
    get store() { return store; },
    get config() { return config; },
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
    keyFromSet:   keyFromSet,
    keysFromSets: keysFromSets
  }
);

export = exported;
