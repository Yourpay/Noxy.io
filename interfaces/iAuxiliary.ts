import * as Promise from "bluebird";

export type tEnum<T> = { [K in keyof T]: T[K] } & {[key: number]: string};
export type tEnumKeys<T> = keyof tEnum<T>;
export type tEnumValue<T> = { [K in keyof T]: T[K] }[keyof T];

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

export type tNonFnPropNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type tNonFnProps<T> = Pick<T, tNonFnPropNames<T>>;
export type tNonFnPropsOptional<T> = Partial<Pick<T, tNonFnPropNames<T>>>;
export type tPromiseFn<T> = () => Promise<T>

export interface iMYSQLTable {
  TABLE_ID: number
  NAME: string
  FLAG: number
  N_COLS: number
  SPACE: number
  ROW_FORMAT: "Dynamic"
  ZIP_PAGE_SIZE: number
  SPACE_TYPE: "General"
  INSTANT_COLS: number
}

export interface iMYSQLTableColumn {
  TABLE_ID: number
  NAME: string
  POS: number
  MTYPE: number
  PRTYPE: number
  LEN: number
  HAS_DEFAULT: number
  DEFAULT_VALUE: string
}

export interface iMYSQLColumnDescription {
  Field: string
  Type: string
  Null: string
  Keu: "" | "PRI" | "UNI" | "MUL"
  Default: string | null
  Extra: string
}