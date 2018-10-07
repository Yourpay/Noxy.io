import * as Promise from "bluebird";
import * as express from "express";
import RoleUser from "../resources/RoleUser";
import Route from "../resources/Route";

export interface iApplicationService {
  readonly store: iApplicationStore
  readonly domain: string
  readonly methods: typeof eApplicationMethods
  readonly published: boolean
  readonly application: express.Application
  
  isAdmin(roles: RoleUser[]): boolean
  
  addSubdomain(subdomain: string): iApplicationSubdomain
  
  addNamespace(subdomain: string, namespace: string): iApplicationNamespace
  
  addPath(subdomain: string, namespace: string, path: string): iApplicationPath
  
  addStatic(public_directory_path: string, subdomain: string, namespace?: string): boolean;
  
  addParam(param: string, subdomain: string, namespace: string | tApplicationMiddleware, mw?: tApplicationMiddleware): boolean
  
  addRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, mw: tApplicationMiddleware | tApplicationMiddleware[]): Promise<Route>
  
  getRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods): Promise<Route>
  
  updateRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, route: Route): Promise<Route>
  
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
  params: {[param: string]: tApplicationMiddleware}
  router: express.Router
  namespaces: {[namespace: string]: iApplicationNamespace}
}

export interface iApplicationNamespace {
  weight: number
  static: string
  params: {[param: string]: tApplicationMiddleware}
  router: express.Router
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
  GET    = "get",
  POST   = "post",
  PUT    = "put",
  DELETE = "delete",
  PATCH  = "patch",
}

export type tApplicationMiddleware = (request: express.Request, response: express.Response, next?: express.NextFunction, value?: string, name?: string) => void
export type tApplicationRouteSet<T> = {[namespace: string]: {[path: string]: { [key in eApplicationMethods]?: T }}}