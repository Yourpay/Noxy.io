import * as express from "express";
import Route from "../resources/Route";
import {tEnumKeys} from "./iAuxiliary";

export interface iApplicationService {
  readonly store: iApplicationStore
  readonly domain: string
  readonly published: boolean
  readonly application: express.Application
  
  addStatic(public_directory_path: string, subdomain: string, namespace?: string): boolean;
  
  addParam(param: string, subdomain: string, mw: tMiddleware | tMiddleware[]): boolean
  
  addParam(param: string, subdomain: string, namespace: string, mw: tMiddleware | tMiddleware[]): boolean
  
  addRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, mw: tMiddleware | tMiddleware[]): Promise<Route>
  
  updateRoute(): Promise<Route>
  
  addRoutes(): Promise<{[path: string]: { [key in tEnumKeys<eApplicationMethods>]: Route }}>
  
  updateRoutes(): Promise<{[path: string]: { [key in tEnumKeys<eApplicationMethods>]: Route }}>
  
  addResource(): Promise<{[path: string]: { [key in tEnumKeys<eApplicationMethods>]: Route }}>
  
  updateResource(): Promise<{[path: string]: { [key in tEnumKeys<eApplicationMethods>]: Route }}>
  
  publicize(): boolean
  
}

export interface iApplicationFn {

}

export interface iApplicationStore {
  [subdomain: string]: {
    router: express.Application
    static: string
    params: {[param: string]: tMiddleware[]}
    namespaces: {
      [namespace: string]: {
        static: string
        params: {[param: string]: tMiddleware[]}
        router: express.Application
        paths: {[path: string]: { [key in tEnumKeys<eApplicationMethods>]: tMiddleware[] }}
      }
    }
  }
}

export interface iApplicationConfiguration {
  published: boolean
  domain: string
  application: express.Application
}

export enum eApplicationMethods {
  GET    = "GET",
  POST   = "POST",
  PUT    = "PUT",
  DELETE = "DELETE",
  PATCH  = "PATCH",
}

export type tMiddleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void
