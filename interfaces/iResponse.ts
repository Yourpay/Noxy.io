import {tObject} from "./iAuxiliary";

export interface iResponseService extends iResponseFn {
  JSON: cResponseJSON;
  Error: cResponseError;
  
  json(code: number, type: string, start: number, content: tObject<any>): iResponseJSON
  
  error(code: number, type: string, content?: Error | Error | tObject<any>): iResponseError
  
  codes: {[code: number]: {[type: string]: string}}
}

export interface iResponseFn {
  (code: number, type: string, start: number, content: tObject<any>): iResponseJSON;
  
  (code: number, type: string, content?: iResponseError | Error | tObject<any>): iResponseError;
}

export interface cResponseJSON {
  new(code: number, type: string, start: number, content?: tObject<any>): iResponseJSON
}

export interface iResponseJSON {
  code: number
  type: string
  message: string
  content: tObject<any>
  time_elapsed: number
  time_completed: number
}

export interface cResponseError {
  new(code: number, type: string, content?: iResponseError | Error | tObject<any>): iResponseError
}

export interface iResponseError {
  code: number
  type: string
  message: string
  log: string[]
  content: tObject<any> | Error
}

export interface iResponseJSONObject {
  code: number
  type: string
  message: string
  content?: any
  time_elapsed?: string
  time_completed: number
}

export interface iResponseErrorObject extends Error {
  code: number
  type: string
  message: string
  log: string[]
  content: tObject<any> | Error
}

export type tResponseContent = {[key: string]: any};
export type tResponseCodes = {[code: number]: {[type: string]: string}};