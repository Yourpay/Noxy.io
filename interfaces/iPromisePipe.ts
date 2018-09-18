import {tEnumValue, tEnum, tPromiseFn, tEV} from "./iAuxiliary";


export interface iPromisePipe {
  <T extends tEnum<T>>(type: T): iPromisePipeConstructor<T>
}

export interface iPromisePipeConstructor<T> {
  promises: {[stage: tEV<T>]: {[key: string]: tPromiseFn}}
  
  promise: (stage: tEV<T>, promise: tPromiseFn) => string
}

export enum ePromisePipeStagesInit {
  "DATABASE"  = "databsae",
  "RESOURCE"  = "resource",
  "PUBLICIZE" = "publicize",
}
