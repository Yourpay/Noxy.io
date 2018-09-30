import * as _ from "lodash";
import {eMethods, iApplicationConfiguration, iApplicationService, iApplicationStore, tMiddleware} from "../interfaces/iApplication";
import {tEnumValue} from "../interfaces/iAuxiliary";

const Service = Default;
const store: iApplicationStore = {};
const configuration: iApplicationConfiguration = {
  published: false
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

function addPath(subdomain: string, namespace: string, path: string, method: tEnumValue<eMethods>) {
  if (!store[subdomain]) { addSubdomain(subdomain); }
  return store[subdomain].namespaces[namespace] || Object.defineProperty(store.namespaces, namespace, {enumerable: true, configurable: false, writable: false, value: {}});
}

function addMethod(subdomain: string, namespace: string, path: string, method: tEnumValue<eMethods>) {
  if (!store[subdomain]) { addSubdomain(subdomain); }
  return store[subdomain].namespaces[namespace] || Object.defineProperty(store.namespaces, namespace, {enumerable: true, configurable: false, writable: false, value: {}});
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

function addRoute(subdomain: string, namespace: string, path: string, middlewares: tMiddleware | tMiddleware[]) {

}

const exported: iApplicationService = _.assign(
  Service,
  {
    get published() { return configuration.published; },
    get store() { return store; },
    addSubdomain: addSubdomain,
    addNamespace: addNamespace,
    addParam:     addParam
    
  }
);

export = exported;
