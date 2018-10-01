import * as Promise from "bluebird";
import {tEnum, tEnumValue, tPromiseFn} from "./iAuxiliary";

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
  promises: { [key in keyof T]?: {[key: string]: tPromiseFn<any>} }
  
  add(stage: keyof T | tEnumValue<T>, fn: tPromiseFn<any>): string
  
  remove(stage: keyof T | tEnumValue<T>, key: string): boolean
  
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
