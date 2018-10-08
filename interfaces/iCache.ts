import * as Promise from "bluebird";

export interface iCacheService extends iCacheFn {
  readonly store: tCacheStore
  
  types: typeof eCacheTypes
  
  get<T>(type: eCacheTypes, namespace: string, key: tCacheKey[]): tCacheReturnPromiseSet<T>
  
  getOne<T>(type: eCacheTypes, namespace: string, key: tCacheKey): tCacheReturnPromise<T>
  
  getAny<T>(type: eCacheTypes, namespace: string, key: tCacheKey[]): tCacheReturnPromise<T>
  
  set<T>(type: eCacheTypes, namespace: string, key: tCacheKey[], value: tCacheValue<T>, options?: iCacheOptions): tCacheReturnPromise<T>
  
  setOne<T>(type: eCacheTypes, namespace: string, key: tCacheKey, value: tCacheValue<T>, options?: iCacheOptions): tCacheReturnPromise<T>
  
  setAny<T>(type: eCacheTypes, namespace: string, key: tCacheKey[], value: tCacheValue<T>, options?: iCacheOptions): tCacheReturnPromise<T>
  
  setOr<T>(setter: tCacheArgumentsObject<T>, ...next: tCacheArgumentsObject<T>[]): tCacheReturnPromise<T>
  
  unset(type: eCacheTypes, namespace: string, key: tCacheKey[]): void
  
  unsetOne(type: eCacheTypes, namespace: string, key: tCacheKey): void
  
  unsetAfter(type: eCacheTypes, namespace: string, key: tCacheKey, milliseconds: number): iCacheTimer
  
  getNamespace(type: eCacheTypes, namespace: string): {[key: string]: iCacheObject};
  
  keyFromSet(keys: tCacheKey[]): string
  
  keysFromSets(keys: tCacheKey[][]): string[]
}

export interface iCacheFn {
  <T>(type: eCacheTypes, namespace: string, key: string[], value: tCacheValue<T>, options?: iCacheOptions): Promise<T | (T | Error)[]>
}

export interface iCacheObject {
  value?: any
  promise?: Promise<any>
  timeout?: iCacheTimer
}

export interface iCacheTimer extends NodeJS.Timer {
  refresh(): any
}

export interface iCacheOptions {
  collision_fallback?: boolean | (() => Promise<any>)
  timeout?: number
}

export enum eCacheTypes {
  VALIDATE = 0,
  SAVE     = 1,
  QUERY    = 2,
  RESOURCE = 3,
  EXTERNAL = 4,
  REQUEST  = 5
}

export type tCacheKey = number | string | symbol;
export type tCacheValue<T> = T | (() => Promise<T>);
export type tCacheReturnPromise<T> = Promise<T>
export type tCacheReturnPromiseSet<T> = Promise<(T | Error)[]>
export type tCacheReturnPromiseMix<T> = Promise<T | (T | Error)[]>
export type tCacheArgumentsObject<T> = {type: eCacheTypes, namespace: string, keys: tCacheKey | tCacheKey[], promise: () => Promise<T>, options?: iCacheOptions};
export type tCacheStore = { [key in keyof typeof eCacheTypes]?: {[namespace: string]: {[key: string]: iCacheObject}} };
export type tCacheConfig = {timeout: 30000};
