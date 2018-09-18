import * as Promise from "bluebird";

// export type tEnumValue<T> = (T extends keyof {[key: string]: string} ? T : never) & (string | number);
// export type tEnum<T> = Record<keyof T, string> & { [key: string]: string };
// export type tEV<T> = {[K in keyof T]: T[K]}[keyof T];

export type tEnum<T> = Record<keyof T, string | number> & {[key: number]: string | number};
export type tEnumValue<T extends tEnum<T>> = { [K in keyof T]: T[K] }[keyof T];
export type tEnumKey<T extends tEnum<T>> = keyof T;

export type tNonFnPropNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type tNonFnProps<T> = Pick<T, tNonFnPropNames<T>>;
export type tNonFnPropsOptional<T> = Partial<Pick<T, tNonFnPropNames<T>>>;
export type tPromiseFn<T> = () => Promise<T>