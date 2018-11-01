import * as Promise from "bluebird";
import * as express from "express";
import Role from "../resources/Role";
import Route from "../resources/Route";
import User from "../resources/User";
import {iResponseError, iResponseJSON} from "./iResponse";

export interface iApplicationService {
  readonly store: iApplicationStore
  readonly domain: string
  readonly methods: typeof eApplicationMethods
  readonly published: boolean
  readonly application: express.Application
  
  hasRole(src_roles: Role | Role[], target_roles: Role | Role[]): boolean
  
  addSubdomain(subdomain: string): iApplicationSubdomain
  
  addNamespace(subdomain: string, namespace: string): iApplicationNamespace
  
  addPath(subdomain: string, namespace: string, path: string): iApplicationPath
  
  addStatic(public_directory_path: string, subdomain: string, namespace?: string): boolean;
  
  addParam(param: string, subdomain: string, namespace: string | tApplicationMiddleware, mw?: tApplicationMiddleware): boolean
  
  addRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, mw: tApplicationMiddleware | tApplicationMiddleware[]): Promise<Route>
  
  getRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods): Route
  
  updateRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, route: Route): Promise<Route>
  
  activate(route: Route): Promise<Route>
  
  activate(subdomain: string, namespace: string, path: string, method: eApplicationMethods): Promise<Route>
  
  deactivate(route: Route): Promise<Route>
  
  deactivate(subdomain: string, namespace: string, path: string, method: eApplicationMethods): Promise<Route>
  
  publicize(): Promise<boolean>
  
  respond(response: express.Response, content: iResponseJSON | iResponseError): express.Response
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

export interface iApplicationRequest extends express.Request {
  vhost: {
    host: string
    hostname: string
    length: number
  }
}

export interface iApplicationResponse extends express.Response {
  locals: {
    time: number
    route: Route
    user: User
    roles: Role[]
    params: {[key: string]: any}
  }
}

export enum eApplicationMethods {
  GET    = "get",
  POST   = "post",
  PUT    = "put",
  DELETE = "delete",
  PATCH  = "patch",
}

export type tApplicationMiddleware = (request: express.Request, response: express.Response, next?: express.NextFunction, value?: string, name?: string) => void
