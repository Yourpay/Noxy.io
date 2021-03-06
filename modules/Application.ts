import * as Promise from "bluebird";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";
import * as methodOverride from "method-override";
import * as path from "path";
import * as favicon from "serve-favicon";
import * as vhost from "vhost";
import {env} from "../globals";
import {eApplicationMethods, iApplicationConfiguration, iApplicationNamespace, iApplicationPath, iApplicationRequest, iApplicationResponse, iApplicationService, iApplicationStore, iApplicationSubdomain, tApplicationMiddleware} from "../interfaces/iApplication";
import {iResponseError, iResponseJSON} from "../interfaces/iResponse";
import * as Response from "../modules/Response";
import Role from "../resources/Role";
import Route from "../resources/Route";
import RouteRole from "../resources/RouteRole";
import User from "../resources/User";
import UserRole from "../resources/UserRole";
import * as Database from "./Database";
import * as Resource from "./Resource";

const Service = Default;
const store: iApplicationStore = {};
const configuration: iApplicationConfiguration = {
  domain:      env.domains[env.mode],
  methods:     eApplicationMethods,
  published:   false,
  application: express()
};

configuration.application.use(bodyParser.json());
configuration.application.use(bodyParser.urlencoded({extended: false}));
configuration.application.use(methodOverride("X-HTTP-Method-Override"));
configuration.application.use(favicon(path.join(__dirname, "../favicon.ico")));

function Default() {

}

function addSubdomain(subdomain: string): iApplicationSubdomain {
  if (!store[subdomain]) {
    Object.defineProperty(store, subdomain, {
      enumerable: true,
      value:      {
        router:     null,
        static:     null,
        params:     {},
        namespaces: {},
        weight:     subdomain === env.subdomains.default ? 0 : 1
      }
    });
  }
  return store[subdomain];
}

function addNamespace(subdomain: string, namespace: string): iApplicationNamespace {
  if (!store[subdomain]) { addSubdomain(subdomain); }
  if (!store[subdomain].namespaces[namespace]) {
    Object.defineProperty(store[subdomain].namespaces, namespace, {
      enumerable: true,
      value:      {
        router: null,
        static: null,
        params: {},
        paths:  {},
        weight: getWeight(namespace)
      }
    });
  }
  return store[subdomain].namespaces[namespace];
}

function addPath(subdomain: string, namespace: string, path: string): iApplicationPath {
  if (!store[subdomain]) { addSubdomain(subdomain); }
  if (!store[subdomain].namespaces[namespace]) { addNamespace(subdomain, namespace); }
  if (!store[subdomain].namespaces[namespace].paths[path]) {
    Object.defineProperty(store[subdomain].namespaces[namespace].paths, path, {
      enumerable: true,
      value:      {
        methods: _.reduce(eApplicationMethods, (r, v, k) => _.set(r, v, null), {}),
        weight:  getWeight(path)
      }
    });
  }
  return store[subdomain].namespaces[namespace].paths[path];
}

function parseSubdomain(subdomain: string): string {
  return _.map(_.filter(subdomain.toString().split("."), v => v.length > 0), v => v.substring(0, 62)).join(".").replace(/^[.-]+|[.-]+$|[^a-zA-Z0-9-.]/g, "").substr(0, 253 - configuration.domain.length);
}

function parsePath(path: string): string {
  return (path = path.replace(/^[\/]+|[\/]+$/g, "")).length === 0 ? "/" : path.replace(/\*{2,}/g, "*");
}

function getWeight(path: string): number {
  return path === "/" ? -1 : _.reduce(path.split("/"), (result, s, i) => result += (i > 0 ? 10000 : 0) + (s.match(/^:.*$/) ? 0 : s.length), 0);
}

function addParam(param: string, subdomain: string, namespace: string | tApplicationMiddleware, middlewares?: tApplicationMiddleware): boolean {
  if (!_.isString(param) || param.length < 1 || param.replace(/^[^a-z]*$/i, "") !== param || (_.isString(namespace) && !middlewares)) { return false; }
  if (_.isString(namespace) && !middlewares) { return !!(addNamespace(parseSubdomain(subdomain), parsePath(namespace)).params[param] = middlewares); }
  return !!(addSubdomain(parseSubdomain(subdomain)).params[param] = <tApplicationMiddleware>namespace);
}

function addStatic(public_directory_path: string, subdomain: string, namespace?: string) {
  if (!_.isString(public_directory_path) || public_directory_path.length < 1) { return false; }
  return !!(namespace ? addNamespace(parseSubdomain(subdomain), parsePath(namespace)).static = public_directory_path : addSubdomain(parseSubdomain(subdomain)).static = public_directory_path);
}

function addRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, middlewares: tApplicationMiddleware | tApplicationMiddleware[]): Promise<Route> {
  return new Route({
    subdomain:  subdomain = parseSubdomain(subdomain),
    namespace:  namespace = parsePath(namespace),
    path:       path = parsePath(path),
    method:     method,
    middleware: _.concat(auth, middlewares, notFound)
  })
  .save({update_protected: true, collision_fallback: true})
  .tap(res => addPath(subdomain, namespace, path).methods[method] = res);
}

function getRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods): Route {
  if (!_.get(store, [subdomain = parseSubdomain(subdomain), "namespaces", namespace = parsePath(namespace), "paths", path = parsePath(path), "methods", method])) {
    throw Response.error(404, "application", {subdomain: subdomain, namespace: namespace, path: path, method: method});
  }
  return store[subdomain].namespaces[namespace].paths[path].methods[method];
}

function updateRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, route: Route): Promise<Route> {
  if (!_.get(store, [subdomain = parseSubdomain(subdomain), "namespaces", namespace = parsePath(namespace), "paths", path = parsePath(path), "methods", method])) {
    return Promise.reject(Response.error(404, "application", {subdomain: subdomain, namespace: namespace, path: path, method: method}));
  }
  if (!(route instanceof Route)) { return Promise.reject(Response.error(400, "application")); }
  return (store[subdomain].namespaces[namespace].paths[path].methods[method] = route).save();
}

function activate(route: Route): Promise<Route>
function activate(subdomain: string, namespace?: string, path?: string, method?: eApplicationMethods): Promise<Route>
function activate(s_or_r: string | Route, namespace?: string, path?: string, method?: eApplicationMethods): Promise<Route> {
  const route = s_or_r instanceof Route ? s_or_r : getRoute(s_or_r, namespace, path, method);
  return updateRoute(route.subdomain, route.namespace, route.path, route.method, _.set(route, "flag_active", 1));
}

function deactivate(route: Route): Promise<Route>
function deactivate(subdomain: string, namespace?: string, path?: string, method?: eApplicationMethods): Promise<Route>
function deactivate(s_or_r: string | Route, namespace?: string, path?: string, method?: eApplicationMethods): Promise<Route> {
  const route = s_or_r instanceof Route ? s_or_r : getRoute(s_or_r, namespace, path, method);
  return updateRoute(route.subdomain, route.namespace, route.path, route.method, _.set(route, "flag_active", 0));
}

function publicize() {
  if (configuration.published) { return Promise.reject(Response.error(409, "application")); }
  _.each(sortObject(store, "weight", "desc"), (subdomain: iApplicationSubdomain, root) => {
    subdomain.router = express();
    if (root !== env.subdomains.default) { configuration.application.use(vhost(`${root}.${configuration.domain}`, subdomain.router)); }
    if (subdomain.static) { subdomain.router.use(express.static(subdomain.static)); }
    if (_.size(subdomain.params) > 0) { _.each(subdomain.params, (middleware, param) => subdomain.router.param(param, middleware)); }
    subdomain.router.use((request, response, next) => {
      response.header("Allow", "PUT, GET, POST, DELETE, OPTIONS");
      response.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
      response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      response.header("X-Frame-Options", "DENY");
      if (request.get("origin") && _.some(_.keys(store), root => `${root}.${configuration.domain}` === request.get("origin").replace(/^\w+:\/\//, ""))) {
        response.header("Access-Control-Allow-Origin", request.get("origin"));
      }
      next();
    });
    _.each(sortObject(subdomain.namespaces, "weight", "desc"), (namespace: iApplicationNamespace, base) => {
      namespace.router = express();
      subdomain.router.use(`/${base}`.replace(/\/{2,}/, "/"), namespace.router);
      if (namespace.static) { namespace.router.use(express.static(namespace.static)); }
      if (_.size(subdomain.params) > 0) { _.each(subdomain.params, (middleware, param) => namespace.router.param(param, middleware)); }
      if (_.size(namespace.params) > 0) { _.each(namespace.params, (middleware, param) => namespace.router.param(param, middleware)); }
      _.each(sortObject(namespace.paths, "weight", "desc"), (path: iApplicationPath, location) => {
        _.each(_.reduce(path.methods, (r, v, k) => v ? _.set(r, k, v) : r, {}), (route: Route, method) => {
          namespace.router[method].apply(namespace.router, _.concat<string | tApplicationMiddleware[]>(`/${location}`.replace(/\/{2,}/, "/"), route.middleware));
        });
      });
    });
  });
  if (store[env.subdomains.default]) { configuration.application.use("/", store[env.subdomains.default].router); }
  configuration.application.all("*", (request, response) => respond(response, Response.error(404, "any")));
  http.createServer(configuration.application).listen(80);
  return Promise.resolve(configuration.published = true);
}

function sortObject(object: object, key: string, sort: "asc" | "desc" | 1 | -1): object {
  return _.reduce(_.keys(object).sort((a, b) => object[a][key] === object[b][key] ? 0 : ((object[a][key] < object[b][key] ? -1 : 1) * ((sort === "asc" || sort > 0) ? 1 : -1))), (r, v) => _.set(r, v, object[v]), {});
}

function hasRole(src_roles: string | Buffer | Role | (string | Buffer | Role)[], target_roles: string | Buffer | Role | (string | Buffer | Role)[]): boolean {
  if (!target_roles || !src_roles) { return false; }
  if (_.isArray(src_roles)) { return _.some(src_roles, src_role => hasRole(src_role, target_roles)); }
  const role = src_roles;
  if (_.isArray(target_roles)) { return _.some(target_roles, target_role => hasRole(role, target_role)); }
  const target = target_roles;
  
  if (typeof role === "string") {
    if (typeof target === "string") { return role === target; }
    if (target instanceof Buffer) { return role === Resource.uuidFromBuffer(target); }
    if (target instanceof Role) {
      if (typeof target.id === "string") { return role === target.id; }
      if (target.id instanceof Buffer) { return role === Resource.uuidFromBuffer(target.id); }
    }
    return false;
  }
  if (role instanceof Buffer) {
    if (typeof target === "string") { return Resource.uuidFromBuffer(role) === target; }
    if (target instanceof Buffer) { return role.equals(target); }
    if (target instanceof Role) {
      if (typeof target.id === "string") { return Resource.uuidFromBuffer(role) === target.id; }
      if (target.id instanceof Buffer) { return role.equals(target.id); }
    }
    return false;
  }
  if (role instanceof Role) {
    if (typeof role.id === "string") {
      if (typeof target === "string") { return role.id === target; }
      if (target instanceof Buffer) { return role.id === Resource.uuidFromBuffer(target); }
      if (target instanceof Role) {
        if (typeof target.id === "string") { return role.id === target.id; }
        if (target.id instanceof Buffer) { return role.id === Resource.uuidFromBuffer(target.id); }
      }
      return false;
    }
    if (role.id instanceof Buffer) {
      if (typeof target === "string") { return Resource.uuidFromBuffer(role.id) === target; }
      if (target instanceof Buffer) { return role.id.equals(target); }
      if (target instanceof Role) {
        if (typeof target.id === "string") { return Resource.uuidFromBuffer(role.id) === target.id; }
        if (target.id instanceof Buffer) { return role.id.equals(target.id); }
      }
      return false;
    }
  }
  
  return false;
}

function respond(response: iApplicationResponse, content: iResponseJSON | iResponseError): express.Response {
  if (content instanceof Error) {
    const object = hasRole(response.locals.roles, new Role(env.roles.admin)) ? content : _.omit(content, ["log", "stack"]);
    return response.status(content.code && _.isNumber(content.code) ? content.code : 500).json(object);
  }
  return response.json(content);
}

function auth(request: iApplicationRequest, response: iApplicationResponse, next: express.NextFunction) {
  return new Promise((resolve, reject) => {
    const subdomain = request.vhost ? request.vhost.host.substring(0, request.vhost.host.length - configuration.domain.length - 1) : env.subdomains.default;
    const namespace = request.baseUrl.replace(/^\/+(?=[^\/\s])|(?<=.)\/+$/g, "");
    const path = request.route.path.replace(/^\/+(?=[^\/\s])|(?<=.)\/+$/g, "");
    const method = _.toLower(request.method);
    
    response.locals.time = Date.now();
    
    if (response.locals.route = _.get(store, [subdomain, "namespaces", namespace, "paths", path, "methods", method])) {
      if (!response.locals.route.flag_active) {
        return userFromJWT(request.get("Authorization"))
        .then(user => {
          if (!user.exists) { return reject(Response.error(404, "any")); }
          return rolesFromUser(user)
          .then(roles => {
            if (hasRole(roles, env.roles.admin.id)) {
              response.locals.user = user;
              response.locals.roles = roles;
              return resolve();
            }
            return reject(Response.error(404, "any"));
          });
        })
        .catch(() => reject(Response.error(404, "any")));
      }
      return rolesFromRoute(response.locals.route)
      .then(route_roles => {
        return userFromJWT(request.get("Authorization"))
        .then(user => {
          if (!user.exists) { reject(Response.error(401, "jwt", {token: request.get("Authorization")})); }
          rolesFromUser(user)
          .then(user_roles => {
            if (hasRole(user_roles, route_roles)) {
              response.locals.user = user;
              response.locals.roles = user_roles;
              return resolve();
            }
            return reject(Response.error(403, "any"));
          })
          .catch(err => reject(err.code === 404 ? Response.error(403, "any", err) : Response.error(err.code, err.type, err)));
        })
        .catch(() => reject(Response.error(401, "jwt", {token: request.get("Authorization")})));
      })
      .catch(err => err.code === 404 ? resolve() : reject(Response.error(err.code, err.type, err)));
    }
    return reject(Response.error(404, "any"));
  })
  .tap(() => next())
  .catch(err => respond(response, err));
}

function rolesFromRoute(route: Route): Promise<Role[]> {
  return Database(env.mode).query<RouteRole[]>("SELECT * FROM ?? WHERE `route_id` = ?", [RouteRole.type, route.id])
  .map(route_role => new Role({id: <Buffer>route_role.role_id}).validate());
}

function rolesFromUser(user: User): Promise<Role[]> {
  return Database(env.mode).query<UserRole[]>("SELECT * FROM ?? WHERE `user_id` = ?", [UserRole.type, user.id])
  .map(user_role => new Role({id: <Buffer>user_role.role_id}).validate());
}

function userFromJWT(token: string): Promise<User> {
  return Promise.promisify(jwt.verify)(token, env.tokens.jwt)
  .then(jwt_user => new User(jwt_user).validate());
}

function notFound(request: iApplicationRequest, response: iApplicationResponse) {
  response.json(Response.json(404, "any", response.locals.time, {}));
}

const exported: iApplicationService = _.assign(
  Service,
  {
    get store() { return store; },
    get domain() { return configuration.domain; },
    get methods() { return configuration.methods; },
    get published() { return configuration.published; },
    get application() { return configuration.application; },
    hasRole:      hasRole,
    addSubdomain: addSubdomain,
    addNamespace: addNamespace,
    addPath:      addPath,
    addParam:     addParam,
    addStatic:    addStatic,
    addRoute:     addRoute,
    getRoute:     getRoute,
    updateRoute:  updateRoute,
    activate:     activate,
    deactivate:   deactivate,
    publicize:    publicize,
    respond:      respond
  }
);

export = exported;
