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

Cache.get = (type: string, namespace: string, keys: Key | Key[] | Key[][]) => {
  const key = _.find(Cache.resolveKeys(keys), key => !!_.get(__store, [type, namespace, key]));
  const current: iCacheObject = _.get(__store, [type, namespace, key], {});
  
  if (current.promise) {
    if (current.timeout) { clearInterval(current.timeout); }
    current.promise.finally(() => current.timeout = setTimeout(() => _.unset(__store, [type, namespace, key]), __config.timeout));
    return current.promise;
  }
  
  return Promise.reject(null);
};

Cache.set = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  const keys: string[] = Cache.resolveKeys(key);
  const promise = value instanceof Function ? value() : Promise.resolve(value);
  
  _.each(keys, key => {
    const current: iCacheObject = _.get(__store, [type, namespace, key], {});
    if (current.timeout) { clearInterval(current.timeout); }
    current.promise = current.promise && current.promise._value === value ? current.promise : promise;
    current.promise.finally(() => _.get(__store, [type, namespace, key]) && (current.timeout = setTimeout(() => _.unset(__store, [type, namespace, key]), __config.timeout || options.timeout)));
    _.merge(__store, _.set({}, [type, namespace, key], current));
  });
  
  return promise;
};

Cache.try = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  return Cache.get<T>(type, namespace, key)
  .catch(err => err ? Promise.reject(err) : Cache.set<T>(type, namespace, key, value, options));
};

Cache.or = <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: () => Promise<T>, or: T | (() => Promise<T>), options?: iCacheOptions): Promise<T> => {
  const keys: string[] = Cache.resolveKeys(key);
  const promise = value()
  .catch(err => err ? Promise.reject(err) : err)
  .then(res => res ? res : or instanceof Function ? or() : Promise.resolve(or));
  
  _.each(keys, key => {
    const current: iCacheObject = _.get(__store, [type, namespace, key], {});
    if (current.timeout) { clearInterval(current.timeout); }
    current.promise = promise;
    current.promise.finally(() => _.get(__store, [type, namespace, key]) && (current.timeout = setTimeout(() => _.unset(__store, [type, namespace, key]), __config.timeout || options.timeout)));
    _.merge(__store, _.set({}, [type, namespace, key], current));
  });
  
  return promise;
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
  or?: <T>(type: string, namespace: string, key: Key | Key[] | Key[][], value: T | (() => Promise<T>), options?: iCacheOptions) => Promise<T>
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
