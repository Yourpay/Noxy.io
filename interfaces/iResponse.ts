export interface iResponseService extends iResponseFn {
  codes: {[code: number]: {[type: string]: string}}
  
  json(code: number, type: string, content?: tResponseContent): iResponseJSONObject;
  
  error(code: number, type: string, content?: tResponseContent | iResponseErrorObject): iResponseErrorObject
}

export interface iResponseFn {
  (code: number, type: string, content?: tResponseContent | iResponseErrorObject, start?: number): iResponseErrorObject | iResponseJSONObject;
}

export interface iResponseJSONObject {
  code: number
  type: string
  message: string
  content: any
  time_elapsed: number
  time_completed: number
}

export interface iResponseErrorObject {
  code: number
  type: string
  message: string
  stack: string[]
  content: tResponseContent
}

export type tResponseContent = {[key: string]: any};
export type tResponseCodes = {[code: number]: {[type: string]: string}};