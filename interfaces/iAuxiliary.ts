import * as Promise from "bluebird";

export type tEnum<T> = {[K in keyof T]: T[K]} & {[key: number]: string};
export type tEnumKey<T> = keyof tEnum<T>;
export type tEnumValue<T> = T extends T[keyof T] ? T : never;

export type tNonFnPropNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type tNonFnProps<T> = Pick<T, tNonFnPropNames<T>>;
export type tNonFnPropsOptional<T> = Partial<Pick<T, tNonFnPropNames<T>>>;
export type tPromiseFn<T> = () => Promise<T>