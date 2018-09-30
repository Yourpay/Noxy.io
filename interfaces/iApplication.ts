import * as express from "express";
import {tEnumKeys} from "./iAuxiliary";

export interface iApplicationService extends iApplicationFn {
  published: boolean
  store: iApplicationStore
}

export interface iApplicationFn {
  (): any
}

export interface iApplicationStore {
  [subdomain: string]: {
    static: string
    params: {[key: string]: tMiddleware[]}
    router: express.Application
    namespaces: {
      [key: string]: {
        static: string
        params: {[key: string]: tMiddleware[]}
        router: express.Application
        paths: {[path: string]: { [key in tEnumKeys<eMethods>]: tMiddleware[] }}
      }
    }
  }
}

export interface iApplicationConfiguration {
  published: boolean
}

export enum eMethods {
  GET    = "GET",
  POST   = "POST",
  PUT    = "PUT",
  DELETE = "DELETE",
  PATCH  = "PATCH",
}

export type tMiddleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void

