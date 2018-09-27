export interface iResponseService extends iResponseFn {
  json(code: number, type: string, content: any): iResponseJSONObject;
  
  error(code: number, type: string, content): iResponseErrorObject
}

export interface iResponseFn {
  (code: number, type: string): iResponseJSONObject;
}

export interface iResponseJSONObject {
  code: number
  type: string
  message: string
  content: any
  time_elapsed: number
  time_finished: number
}

export interface iResponseErrorObject extends Error {
  code: number
  type: string
  name: string
  message: string
  stack: string
}


