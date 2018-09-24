import * as Promise from "bluebird";

export type tEnum<T> = {[K in keyof T]: T[K]} & {[key: number]: string};
export type tEnumKeys<T> = keyof tEnum<T>;
export type tEnumValue<T> = {[K in keyof T]: T[K]}[keyof T];

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

export type tNonFnPropNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type tNonFnProps<T> = Pick<T, tNonFnPropNames<T>>;
export type tNonFnPropsOptional<T> = Partial<Pick<T, tNonFnPropNames<T>>>;
export type tPromiseFn<T> = () => Promise<T>