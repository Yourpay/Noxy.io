import * as Promise from "bluebird";
import {tEnum, tPromiseFn} from "./iAuxiliary";

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
  promises: { [P in keyof T]?: {[key: string]: tPromiseFn<any>} }
  
  add(stage: { [P in keyof T]: T[P] }[keyof T] & (string | number), fn: tPromiseFn<any>): string
  
  remove(stage: { [P in keyof T]: T[P] }[keyof T] & (string | number), key: string): boolean
  
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
