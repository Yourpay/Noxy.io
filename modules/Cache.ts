import * as Promise from "bluebird";
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

Cache.get = <T>(type: string, namespace: string, keys: Key | Key[] | Key[][]) => {
  const key = _.find(Cache.getKeyStrings(keys), key => !!_.get(__store, [type, namespace, key]));
  const current: iCacheObject = _.get(__store, [type, namespace, key]);
  
  if (current) {
    if (current.timeout) { current.timeout.refresh(); }
    if (current.promise) { return current.promise; }
    return Promise.resolve(current.value);
  }
  
  return Promise.reject(null);
};

Cache.set = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  const keys: string[] = Cache.getKeyStrings(key);
  const promise: Promise<T> = typeof value === "function" ? value() : Promise.resolve(value);
  
  _.each(keys, key => {
    
    const current: iCacheObject = _.get(__store, [type, namespace, key], {});
    if (current.timeout) { current.timeout.refresh(); }
    
    if (current.promise) {
      return Promise.props({
        old: current.promise,
        new: promise
      })
      .then((res: {old: T, new: T}) => {
        if (_.isEqual(res.old, res.new)) {
          return Promise.resolve(res.old);
        }
        return Promise.reject(new Error("Transactional error occured. Attempted to overwrite data during transaction."));
      });
    }
    
    _.set(__store, [type, namespace, key, "promise"], promise);
    
    promise.then(res => {
      _.unset(__store, [type, namespace, key, "promise"]);
      _.set(__store, [type, namespace, key, "value"], res);
      return res;
    })
    .finally(() => _.each(keys, (key) => _.set(__store, [type, namespace, key, "timeout"], Cache.getTimeout(type, namespace, key, _.get(options, "timeout", __config.timeout)))));
  });
  
  return promise;
};

Cache.try = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  return Cache.get<T>(type, namespace, key)
  .catch(err => err ? Promise.reject(err) : Cache.set<T>(type, namespace, key, value, options));
};

Cache.or = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: () => Promise<T>, or: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  const keys: string[] = Cache.getKeyStrings(key);
  
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
        .finally(() => _.each(keys, (key) => _.set(__store, [type, namespace, key, "timeout"], Cache.getTimeout(type, namespace, key, _.get(options, "timeout", __config.timeout)))));
      });
    })
  );
};

Cache.unset = (type: string, namespace: string, key: Key | Key[] | Key[][]) => {
  const keys: string[] = Cache.getKeyStrings(key);
  _.each(keys, key => {
    const current: iCacheObject = _.get(__store, [type, namespace, key]);
    if (current.timeout) { clearInterval(current.timeout); }
    _.unset(__store, [type, namespace, key]);
  });
};

Cache.getTimeout = (type: string, namespace: string, key: string, milliseconds?: number): iCacheTimer => {
  if (_.isUndefined(milliseconds)) { return _.get(__store, [type, namespace, key]); }
  if (milliseconds === null) { return null; }
  return <iCacheTimer>setTimeout(() => _.unset(__store, [type, namespace, key]), milliseconds);
};

Cache.getKeyStrings = (keys: Key | Key[] | Key[][]) => _.isArray(keys) ? _.every(keys, v => _.isArray(v)) ? _.map(<(string | number | symbol)[][]>keys, v => _.join(v, "::")) : [_.join(keys, "::")] : [`${keys}`];

Cache.getNamespace = (type: string, namespace: string): {[key: string]: iCacheObject} => {
  return _.get(__store, [type, namespace]);
};

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

Cache.constants = {
  "QUERY":    "query",
  "RESOURCE": "resource"
};

export = Cache;

interface iCache {
  get?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][]) => Promise<T>
  set?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  try?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  or?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), or: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
  unset?: (type: string, namespace: string, key: Key | Key[] | Key[][]) => void
  
  getNamespace?: (type: string, namespace: string) => {[key: string]: iCacheObject};
  getTimeout?: (type: string, namespace: string, key: string, milliseconds?: number) => NodeJS.Timer
  getKeyStrings?: (keys: Key | Key[] | Key[][]) => string[]
  
  show?: () => void
  
  constants?: {QUERY: "query", RESOURCE: "resource"}
  
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
  promise: Promise<any>
  timeout: iCacheTimer
}

interface iCacheOptions {
  timeout?: number
}

interface iCacheTimer extends NodeJS.Timer {
  refresh: () => void
}

type Key = string | number;
