import Promise from "aigle";
import * as _ from "lodash";

const Cache: iCache = Default;
const __store: iCacheStore = {};
const __config: iCacheOptions = {
  timeout: 30000
};

function Default<T>(type: string, namespace: string, key: Key | Key[] | Key[][], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> {
  return value ? Cache.set(type, namespace, key, value, options) : Cache.get(type, namespace, key);
}

/**
 * Attempt to retrieve a value from the cache tied to a type, namespace and the first key in a list of keys.
 * If a cache hit occurs, this function either returns a pending promise to be resolved that updates the cache value or the cache value if none is pending.
 * If a cache miss occurs, this function returns a rejection with value null.
 */

Cache.get = (type: string, namespace: string, keys: Key | Key[] | Key[][]) => {
  const key = _.find(Cache.resolveKeys(keys), key => !!_.get(__store, [type, namespace, key]));
  const current: iCacheObject = _.get(__store, [type, namespace, key]);
  
  if (current) {
    if (current.timeout) { clearInterval(current.timeout); }
    if (current.promise) {
      current.promise.finally(() => current.timeout = setTimeout(() => _.unset(__store, [type, namespace, key]), __config.timeout));
      return current.promise;
    }
    current.timeout = setTimeout(() => _.unset(__store, [type, namespace, key]), __config.timeout);
    return Promise.resolve(current.value);
  }
  
  return Promise.reject(null);
};

Cache.set = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  const keys: string[] = Cache.resolveKeys(key);
  const promise = value instanceof Function ? value() : Promise.resolve(value);
  
  _.each(keys, key => {
  
    const current: iCacheObject = _.get(__store, [type, namespace, key]);
    if (current.timeout) { clearInterval(current.timeout); }
  
    if (current.promise) {
      return Promise.parallel({
        old: current.promise,
        new: promise
      })
      .then(res => _.isEqual(res.old, res.new) ? Promise.resolve(res.old) : Promise.reject(new Error("Transactional error occured. Attempted to overwrite data during transaction. ")));
    }
  
    _.set(__store, [type, namespace, key, "promise"], promise);
    return promise
    .then(res => _.set(__store, [type, namespace, key, "value"], res))
    .finally(() => _.set(__store, [type, namespace, key, "timeout"], setTimeout(() => _.unset(__store, [type, namespace, key]), __config.timeout)));
  });
  
  return promise;
};

Cache.try = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  return Cache.get<T>(type, namespace, key)
  .catch(err => err ? Promise.reject(err) : Cache.set<T>(type, namespace, key, value, options));
};

Cache.or = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: () => Promise<T>, or: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  const keys: string[] = Cache.resolveKeys(key);
  
  return Cache.try("or", namespace, key, () =>
    Cache.get<T>(type, namespace, key)
    .catch(err => {
      if (err) { return Promise.reject(err); }
      return value()
      .catch(err => err ? Promise.reject(err) : err)
      .then(res => {
        if (res) { return res; }
        console.log("Heading towards or:", res);
        console.log("What is in the cache:", Cache.get(type, namespace, key));
        if (or instanceof Function) { return or(); }
        return Promise.resolve(or);
      })
      .catch(err => console.log(err))
      .then(res => {
        console.log(res);
        Cache.unset("or", namespace, key);
        return Cache.set(type, namespace, key, res)
        .finally(() =>
          _.each(keys, (key) =>
            (_.get(__store, [type, namespace, key])) && (_.get(__store, [type, namespace, key]).timeout = setTimeout(() => _.unset(__store, [type, namespace, key]), __config.timeout || options.timeout))
          )
        );
      });
    })
  );
  
  // Cache.try(type, namespace, key, () =>
  //   value()
  //   .catch(err => err ? Promise.reject(err) : err)
  //   .then(res => {
  //     if (res) { return res; }
  //     if (or instanceof Function) { return or(); }
  //     return Promise.resolve(or);
  //   })
  // );
  //
  // const promise = value()
  // .catch(err => err ? Promise.reject(err) : err)
  // .then(res => res ? res : or instanceof Function ? or() : Promise.resolve(or));
  //
  // _.each(keys, key => {
  //   const current: iCacheObject = _.get(__store, [type, namespace, key], {});
  //   if (current.timeout) { clearInterval(current.timeout); }
  //   current.promise = promise;
  //   current.promise.finally(() => _.get(__store, [type, namespace, key]) && (current.timeout = setTimeout(() => _.unset(__store, [type, namespace, key]), __config.timeout || options.timeout)));
  //   _.merge(__store, _.set({}, [type, namespace, key], current));
  // });
  //
  // return promise;
};

Cache.unset = (type: string, namespace: string, key: Key | Key[] | Key[][]) => {
  const keys: string[] = Cache.resolveKeys(key);
  _.each(keys, key => {
    const current: iCacheObject = _.get(__store, [type, namespace, key]);
    if (current.timeout) { clearInterval(current.timeout); }
    _.unset(__store, [type, namespace, key]);
  });
};

Cache.resolveKeys = (key: Key | Key[] | Key[][]) => _.isArray(key) ? _.every(key, v => _.isArray(v)) ? _.map(<(string | number | symbol)[][]>key, v => _.join(v, "::")) : [_.join(key, "::")] : [`${key}`];

Cache.show = () => {
  console.info("LOGGING CACHE CONFIG");
  console.log(__config);
  console.info("LOGGING CACHE STORE");
  _.each(__store, (types, type_key) => {
    _.each(types, (namespaces, namespace_key) => {
      _.each(namespaces, (value, key) => {
        console.log(type_key, namespace_key, key, value);
      });
    });
  });
};

export = Cache;

interface iCache {
  get?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][]) => Promise<T>
  set?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  try?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  or?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), or: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  unset?: (type: string, namespace: string, key: Key | Key[] | Key[][]) => void
  resolveKeys?: (keys: Key | Key[] | Key[][]) => string[]
  show?: () => void
  
  <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value?: T | (() => Promise<T>), options?: iCacheOptions): Promise<T>
}

interface iCacheStore {
  [type: string]: {
    [namespace: string]: {
      [key: string]: iCacheObject
    }
  }
}

interface iCacheObject {
  value: any
  promise: iResolvedPromise<any>
  timeout: NodeJS.Timer
}

interface iCacheOptions {
  timeout?: number
}

interface iResolvedPromise<T> extends Promise<T> {
  _value?: any
  _resolved?: number,
  _key?: any,
  _receiver?: any,
  _onFulfilled?: any,
  _onRejected?: any,
  _receivers?: any
}

type Key = string | number;
