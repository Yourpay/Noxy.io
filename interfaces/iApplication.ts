import * as Promise from "bluebird";
import * as express from "express";
import Route from "../resources/Route";
import {cResource} from "./iResource";

export interface iApplicationService {
  readonly store: iApplicationStore
  readonly domain: string
  readonly methods: typeof eApplicationMethods
  readonly published: boolean
  readonly application: express.Application
  
  addStatic(public_directory_path: string, subdomain: string, namespace?: string): boolean;
  
  addParam(param: string, subdomain: string, mw: tApplicationMiddleware | tApplicationMiddleware[]): boolean
  
  addParam(param: string, subdomain: string, namespace: string, mw: tApplicationMiddleware | tApplicationMiddleware[]): boolean
  
  addRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, mw: tApplicationMiddleware | tApplicationMiddleware[]): Promise<Route>
  
  updateRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, mw: tApplicationMiddleware | tApplicationMiddleware[]): Promise<Route>
  
  addRoutes(subdomain: string, routes: tApplicationRouteSet<tApplicationMiddleware | tApplicationMiddleware[]>): Promise<tApplicationRouteSet<Promise<Route>>>
  
  addResource(resource: cResource, subdomain?: string): Promise<tApplicationRouteSet<Promise<Route>>>
  
  publicize(): Promise<boolean>
}

export interface iApplicationFn {

}

export interface iApplicationStore {
  [subdomain: string]: iApplicationSubdomain
}

export interface iApplicationSubdomain {
  weight: number
  static: string
  params: {[param: string]: tApplicationMiddleware[]}
  router: express.Application
  namespaces: {[namespace: string]: iApplicationNamespace}
}

export interface iApplicationNamespace {
  weight: number
  static: string
  params: {[param: string]: tApplicationMiddleware[]}
  router: express.Application
  paths: {[path: string]: iApplicationPath}
}

export interface iApplicationPath {
  weight: number
  methods: { [key in eApplicationMethods]: Route }
}

export interface iApplicationConfiguration {
  domain: string
  methods: typeof eApplicationMethods
  published: boolean
  application: express.Application
}

export enum eApplicationMethods {
  GET    = "GET",
  POST   = "POST",
  PUT    = "PUT",
  DELETE = "DELETE",
  PATCH  = "PATCH",
}

export type tApplicationMiddleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void
export type tApplicationRouteSet<T> = {[namespace: string]: {[path: string]: { [key in eApplicationMethods]?: T }}}