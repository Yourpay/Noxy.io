export interface iResponseService extends iResponseFn {
  codes: {[code: number]: {[type: string]: string}}
  
  json(code: number, type: string, content?: tResponseContent, start?: number): iResponseJSONObject;
  
  error(code: number, type: string, content?: tResponseContent | iResponseErrorObject): iResponseErrorObject
}

export interface iResponseFn {
  (code: number, type: string, content?: tResponseContent | iResponseErrorObject, start?: number): iResponseErrorObject | iResponseJSONObject;
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
  content: tResponseContent
}

export type tResponseContent = {[key: string]: any};
export type tResponseCodes = {[code: number]: {[type: string]: string}};