import * as express from "express";
import Route from "../resources/Route";
import {tEnumKeys, tEnumValue} from "./iAuxiliary";

export interface iApplicationService {
  readonly domain: string
  readonly router: iApplicationRouter
  readonly application: express.Application
  
  addStatic(public_directory_path: string, subdomain: string, namespace?: string): boolean;
  
  addParam(param: string, subdomain: string, mw: Middleware | Middleware[]): boolean
  
  addParam(param: string, subdomain: string, namespace: string, mw: Middleware | Middleware[]): boolean
  
  addRoute(subdomain: string, namespace: string, path: string, method: tEnumValue<eRequestMethods>, mw: Middleware | Middleware[]): Promise<Route>
  
  updateRoute(): Promise<Route>
  
  addRoutes(): Promise<{[path: string]: { [key in tEnumKeys<eRequestMethods>]: Route }}>
  
  updateRoutes(): Promise<{[path: string]: { [key in tEnumKeys<eRequestMethods>]: Route }}>
  
  addResource(): Promise<{[path: string]: { [key in tEnumKeys<eRequestMethods>]: Route }}>
  
  updateResource(): Promise<{[path: string]: { [key in tEnumKeys<eRequestMethods>]: Route }}>
  
  publicize(): boolean
  
}

export interface iApplicationFn {

}

export interface iApplicationRouter {
  [subdomain: string]: {
    router: express.Application
    static: string
    params: {[param: string]: Middleware[]}
    namespaces: {
      [namespace: string]: {
        static: string
        params: {[param: string]: Middleware[]}
        router: express.Application
        paths: {[path: string]: { [key in tEnumKeys<eRequestMethods>]: Middleware[] }}
      }
    }
  }
}

export enum eRequestMethods {
  GET    = "GET",
  POST   = "POST",
  PUT    = "PUT",
  DELETE = "DELETE",
  PATCH  = "PATCH",
}

export type tApplicationRouters = {[subdomain: string]: {[key: string]: express.Router}}

export type tApplicationSubdomains = {[subdomain: string]: express.Router}

export type tApplicationParams = {[key: string]: tApplicationParam}
export type tApplicationParam = {middleware: Middleware, subdomain: string, namespace: string, name: string}

export type tApplicationStatics = {[key: string]: tApplicationStatic}
export type tApplicationStatic = {subdomain: string, namespace: string, resource_path: string}

export type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void
