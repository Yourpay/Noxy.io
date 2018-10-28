import * as Promise from "bluebird";
import {tEnum, tEnumKeys, tPromiseFunction} from "./iAuxiliary";

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
  stages: T
  promises: { [P in tEnumKeys<T>]?: {[key: string]: tPromiseFunction<any>} }
  
  add(stage: tEnumKeys<T>, fn: tPromiseFunction<any>): string
  
  remove(stage: tEnumKeys<T>, key: string): boolean
  
  resolve(): Promise<any>
  
  fork(): iPromisePipe<T>
  
  unlock(): this
}

export enum ePromisePipeStatus {
  "READY"     = 0,
  "RESOLVING" = 1,
  "RESOLVED"  = 2,
  "REJECTED"  = -1
}

export enum ePromisePipeStagesInit {
  "DATABASE"  = 0,
  "RESOURCE"  = 1,
  "PUBLICIZE" = 2,
}
