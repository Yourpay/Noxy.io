import {tEnum, tEnumKeys, tEnumValue, tPromiseFn} from "./iAuxiliary";

export interface iPromisePipeService extends iPromisePipeFn {
  Constructor: cPromisePipe
}

export interface iPromisePipeFn {
  <T extends tEnum<T>>(stages: T): iPromisePipe<T>
}

export interface cPromisePipe {
  new<T extends tEnum<T>>(stages: T): iPromisePipe<T>
}

export interface iPromisePipe<T> {
  status: tEnumValue<ePromisePipeStatus>
  stages: T
  promises: { [key in tEnumKeys<T>]: {[key: string]: tPromiseFn<any>} }
  
  add(stage: tEnumValue<T>, fn: tPromiseFn<any>): string
  
  remove(stage: tEnumValue<T>, key: string): boolean
  
  resolve(): Promise<any>
  
  fork(): iPromisePipe<T>
}

export enum ePromisePipeStatus {
  "READY"     = 0,
  "RESOLVING" = 1,
  "RESOLVED"  = 2,
  "REJECTED"  = -1
}

export enum ePromisePipeStagesInit {
  "DATABASE"  = "databsae",
  "RESOURCE"  = "resource",
  "PUBLICIZE" = "publicize",
}
