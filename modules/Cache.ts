import Promise from "aigle";
import * as _ from "lodash";

const service: iCache = Cache;
const __config = {
  timeout: 30000
};
const __store = {};

function Cache<T>(type: string, namespace: string, key: Key, value: T): Promise<T> {
  return service.set(type, namespace, key, value);
}

service.set = <T>(type: string, namespace: string, key: Key, value: T): Promise<T> => {
  const path = service.resolveKey(key);
  
  if (_.get(__store, [type, namespace, path])) {
    clearInterval(_.get(__store, [type, namespace, path]).timeout)
  }
  
  const promise: resolvedPromise<T> = Promise.resolve(value);
  
  console.log(promise);
  
  _.setWith(__store, [type, namespace, path], {
    promise: promise,
    timeout: setTimeout(() => {
      _.unset(__store, [type, namespace, path]);
      service.show();
    }, __config.timeout)
  }, Object);
  
  return promise;
};

service.resolveKey = (...keys: Key[]) => _.join(_.flattenDeep(keys), "::");

service.show = () => {
  console.info("LOGGING CACHE CONFIG");
  console.log(__config);
  console.info("LOGGING CACHE STORE");
  console.log(__store);
};

export = service;

interface iCache {
  <T>(type: string, namespace: string, key: Key, value: T): Promise<T>
  
  set?: <T>(type: string, namespace: string, key: Key, value: T) => Promise<T>
  
  resolveKey?: (...keys: Key[]) => string
  
  show?: () => void
}

interface iStore {
  
}

interface resolvedPromise<T> extends Promise<T> {
  _value?: any
  _resolved?: number,
  _key?: any,
  _receiver?: any,
  _onFulfilled?: any,
  _onRejected?: any,
  _receivers?: any
}

type Key = string | number | symbol | (string | number | symbol)[];
