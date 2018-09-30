import * as express from "express";
import * as _ from "lodash";
import {env} from "../globals";
import {eApplicationMethods, iApplicationConfiguration, iApplicationService, iApplicationStore, tMiddleware} from "../interfaces/iApplication";
import Route from "../resources/Route";

const Service = Default;
const store: iApplicationStore = {};
const configuration: iApplicationConfiguration = {
  published:   false,
  domain:      env.domains[env.mode],
  application: express()
};

function Default() {

}

function addSubdomain(subdomain: string) {
  return store[subdomain] || Object.defineProperty(store, subdomain, {enumerable: true, configurable: false, writable: false, value: {}});
}

function addNamespace(subdomain: string, namespace: string) {
  if (!store[subdomain]) { addSubdomain(subdomain); }
  return store[subdomain].namespaces[namespace] || Object.defineProperty(store.namespaces, namespace, {enumerable: true, configurable: false, writable: false, value: {}});
}

function addPath(subdomain: string, namespace: string, path: string) {
  if (!store[subdomain].namespaces[namespace]) { addNamespace(subdomain, namespace); }
  return store[subdomain].namespaces[namespace].paths[path] || Object.defineProperty(store.namespaces[namespace].paths, path, {enumerable: true, configurable: false, writable: false, value: {}});
}

function addMethod(subdomain: string, namespace: string, path: string, method: eApplicationMethods) {
  if (!store[subdomain].namespaces[namespace].paths[path]) { addPath(subdomain, namespace, path); }
  return store[subdomain].namespaces[namespace].paths[path] || Object.defineProperty(store.namespaces[namespace].paths[path], method, {enumerable: true, configurable: false, writable: false, value: {}});
}

function addParam(param: string, subdomain: string, middlewares: tMiddleware | tMiddleware[]): boolean;
function addParam(param: string, subdomain: string, namespace: string, middlewares: tMiddleware | tMiddleware[]): boolean;
function addParam(param: string, subdomain: string, namespace: string | tMiddleware | tMiddleware[], middlewares?: tMiddleware | tMiddleware[]): boolean {
  if (middlewares) {
    addNamespace(subdomain, <string>namespace);
    return !!(store[subdomain].namespaces[<string>namespace].params[param] = _.concat(middlewares));
  }
  addSubdomain(subdomain);
  return !!(store[subdomain].params[param] = _.concat(middlewares));
}

function addStatic(public_directory_path: string, subdomain: string, namespace?: string) {
  if (namespace) {
    addNamespace(subdomain, namespace);
    return !!(store[subdomain].namespaces[namespace].static = public_directory_path);
  }
  addSubdomain(subdomain);
  return !!(store[subdomain].static = public_directory_path);
}

function addRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, middlewares: tMiddleware | tMiddleware[]) {
  addMethod(subdomain, namespace, path, method);
  return new Route({subdomain: subdomain, namespace: namespace, path: path, method: method, middleware: _.concat(auth, middlewares)})
  .save({update_protected: true, timeout: null, collision_fallback: true});
}

function auth() {

}

const exported: iApplicationService = _.assign(
  Service,
  {
    get store() { return store; },
    get domain() { return configuration.domain; },
    get published() { return configuration.published; },
    get application() { return configuration.application; },
    addSubdomain: addSubdomain,
    addNamespace: addNamespace,
    addPath:      addPath,
    addMethod:    addMethod,
    addParam:     addParam
    
  }
);

export = exported;
