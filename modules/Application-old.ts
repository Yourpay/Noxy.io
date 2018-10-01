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
import {eResourceType} from "../interfaces/iResource";
import * as Cache from "../modules/Cache";
import * as Database from "../modules/Database";
import * as Resource from "../modules/Resource";
import * as Response from "../modules/Response";
import RoleRoute from "../resources/RoleRoute";
import RoleUser from "../resources/RoleUser";
import Route from "../resources/Route";
import User from "../resources/User";

let __published: boolean;
const __domain: string = env.domains[env.mode];
const __methods: Method[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const __params: {[key: string]: Param} = {};
const __statics: {[key: string]: Static} = {};
const __routers: {[subdomain: string]: {[key: string]: express.Router}} = {};
const __subdomains: {[key: string]: express.Router} = {};
const __application: express.Application = express();

__application.use(bodyParser.json());
__application.use(bodyParser.urlencoded({extended: false}));
__application.use(methodOverride("X-HTTP-Method-Override"));
__application.use(favicon(path.join(__dirname, "../favicon.ico")));

export function addStatic(resource_path: string, subdomain: string, namespace?: string): Static {
  const key = _.join(_.filter([subdomain, namespace]), "::");
  
  return __statics[key] = {subdomain: subdomain, namespace: namespace, resource_path: resource_path};
}

export function addParam(subdomain: string, param: string, fn: Middleware): Param
export function addParam(subdomain: string, ns_pm: string, pm_fn: string | Middleware, fn?: Middleware): Param {
  const key = Cache.keyFromSet(<string[]>_.filter([subdomain, ns_pm, pm_fn], v => typeof v === "string"));
  
  return __params[key] = {middleware: fn ? fn : <Middleware>pm_fn, subdomain: subdomain, namespace: fn ? ns_pm : null, name: fn ? <string>pm_fn : ns_pm};
}

export function addRoute(subdomain: string, namespace: string, path: string, method: Method, fn: Middleware | Middleware[]): Promise<Route> {
  const key = Cache.keyFromSet([subdomain, ("/" + namespace + path).replace(/\/{2,}/, "/").replace(/\/$/, ""), method]);
  
  return new Route({subdomain: subdomain, namespace: namespace, path: path, method: method, middleware: _.concat(auth, fn)})
  .save({update_protected: true, keys: [key], timeout: null, collision_fallback: true});
}

export function updateRoute(route: Route, fn?: Middleware | Middleware[]): Promise<Route> {
  // TODO: Implement middleware changer function
  const key = Cache.keyFromSet([route.subdomain, ("/" + route.namespace + route.path).replace(/\/{2,}/, "/").replace(/\/$/, ""), route.method]);
  
  return route.save({update_protected: true, keys: [key], timeout: null, collision_fallback: true});
}

export function addRoutes(subdomain: string, namespace: string, route_set: {[path: string]: {[method: string]: Middleware | Middleware[]}}): {[key: string]: Promise<Route>} {
  return _.transform(route_set, (routes, methods, url) => {
    return _.set(routes, url, _.transform(methods, (result, middleware: Middleware | Middleware[], method: Method) => {
      if (_.includes(__methods, method)) {
        return _.set(result, method, addRoute(subdomain, namespace, url, method, middleware));
      }
      return result;
    }, {}));
  }, {});
}

export function addResource(resource: typeof Resource.Constructor): {[key: string]: Promise<Route>} {
  return addRoutes(env.subdomains.api, resource.type, {
    "/":      {
      "GET":  (request, response) => {
        resource.select(request.query.start, request.query.limit)
        .catch(err => err instanceof Response.json ? err : Response.json(404, "any", {start: request.query.start, limit: request.query.limit}))
        .then(res => response.status(res.code || 200).json(res));
      },
      "POST": []
    },
    "/:id":   {
      "GET":    (request, response) => {
        resource.selectByID(Resource.bufferFromUUID(request.query.id))
        .catch(err => err instanceof Response.json ? err : Response.json(404, "any", {id: request.query.id}))
        .then(res => response.status(res.code || 200).json(res));
      },
      "PUT":    [],
      "DELETE": []
    },
    "/count": {
      "GET": (request, response) => {
        resource.count()
        .catch(err => err instanceof Response.json ? err : Response.json(404, "any"))
        .then(res => response.status(200).json(res));
      }
    }
  });
}

export function publicize(): boolean {
  let subdomain: express.Router, router: express.Router;
  
  if (__published) { return __published; }
  
  _.each(_.orderBy(_.uniqBy(_.map(Cache.store[Cache.types.RESOURCE][Route.type], "value"), v => _.join([v.subdomain, v.namespace, v.path, v.method])), ["weight"], ["desc"]), route => {
    if (!(subdomain = __subdomains[route.subdomain])) {
      subdomain = __subdomains[route.subdomain] = express.Router();
      if (route.subdomain !== env.subdomains.default) { __application.use(vhost(route.subdomain + "." + __domain, subdomain)); }
    }
    if (!(router = _.get(__routers, [route.subdomain, route.namespace]))) {
      _.set(__routers, [route.subdomain, route.namespace], router = express.Router());
      const static_key = _.join(_.filter([route.subdomain, route.namespace]), "::");
      if (__statics[static_key]) { router.use(express.static(__statics[static_key].resource_path)); }
      if (__statics[route.subdomain] && !__statics[route.subdomain].namespace) { subdomain.use(express.static(__statics[route.subdomain].resource_path)); }
      subdomain.use((request, response, next) => {
        response.header("Allow", "PUT, GET, POST, DELETE, OPTIONS");
        response.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
        response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        response.header("X-Frame-Options", "DENY");
        if (request.get("origin") && _.some(_.keys(__subdomains), subdomain => `${subdomain}.${__domain}` === request.get("origin").replace(/^\w+:\/\//, ""))) {
          response.header("Access-Control-Allow-Origin", request.get("origin"));
        }
        next();
      });
      subdomain.use(router);
    }
    return router[_.toLower(route.method)].apply(router, _.concat(<any>route.url, route.middleware));
  });
  if (!__routers[env.subdomains.default]) { __subdomains[env.subdomains.default] = express.Router(); }
  _.each(__params, param => _.each(param.namespace ? [__routers[param.subdomain][param.namespace]] : __routers[param.subdomain], (n: any) => n.param(param.name, param.middleware)));
  __application.use("/", __subdomains[env.subdomains.default]);
  __application.all("*", (request, response) => response.status(404).json(Response.json(404, "any")));
  http.createServer(__application).listen(80);
  return __published = true;
}

function auth(request: express.Request & {vhost: {host: string}}, response: express.Response, next: express.NextFunction): void {
  const path = (request.baseUrl + request.route.path).replace(/\/$/, "");
  const subdomain = request.vhost ? request.vhost.host.replace(__domain, "").replace(/[.]*$/, "") : env.subdomains.default;
  const key = Cache.keyFromSet([subdomain, path, request.method]);
  
  response.locals.time = Date.now();
  Cache.getOne<Route>(Cache.types.RESOURCE, Route.type, key)
  .then(route => {
    if (route && route.exists) {
      if (!route.flag_active) {
        return new Promise(resolve => resolve(jwt.verify(request.get("Authorization"), env.tokens.jwt)))
        .then(user =>
          new User(user).validate()
          .then(user => {
            if (!user.exists) { return Promise.reject(Response.json(404, "any")); }
            Database(env.mode).query<RoleUser[]>("SELECT * FROM ?? WHERE `user_id` = ?", [eResourceType.ROLE_USER, user.id])
            .catch(err => err.code === 404 && err.type === "query" ? Promise.reject(Response.json(404, "any")) : Promise.reject(Response.json(err.code, err.type)))
            .then(user_roles => {
              if (_.some(user_roles, role => Resource.uuidFromBuffer(<Buffer>role.role_id) === env.roles.admin.id)) {
                response.locals.user = user;
                response.locals.roles = user_roles;
                return next();
              }
              throw Response.json(404, "any");
            });
          })
        )
        .catch(() => Promise.reject(Response.json(404, "any")));
      }
      return Database(env.mode).query<RoleRoute[]>("SELECT * FROM ?? WHERE `route_id` = ?", [eResourceType.ROLE_ROUTE, route.id])
      .then(route_roles =>
        !route_roles.length ? next() : new Promise(resolve => resolve(jwt.verify(request.get("Authorization"), env.tokens.jwt)))
        .then(user =>
          new User(user).validate()
          .then(user => {
            if (!user.exists) { Promise.reject(Response.error(401, "jwt", {token: request.get("Authorization")})); }
            Database(env.mode).query<RoleUser[]>("SELECT * FROM ?? WHERE `user_id` = ?", [eResourceType.ROLE_USER, user.id])
            .catch(err => err.code === 404 && err.type === "query" ? Promise.reject(Response.json(403, "any")) : Promise.reject(Response.json(err.code, err.type)))
            .then(user_roles => {
              if (_.some(route_roles, route_role => _.some(user_roles, user_role => user_role.uuid === route_role.uuid))) {
                response.locals.user = user;
                response.locals.roles = user_roles;
                return next();
              }
              throw Response.json(403, "any");
            });
          })
        )
        .catch(err => Promise.reject(Response.json(401, "jwt", err)))
      )
      .catch(err => err.code === 404 && err.type === "query" ? Promise.resolve(next()) : Promise.reject(Response.error(err.code, err.type, err)));
    }
    return Promise.reject(Response.json(404, "any"));
  })
  .catch(err => {
    if (err instanceof Response.json) { return response.status(err.code).json(err); }
    if (err.name === "JsonWebTokenError") { return response.status(401).json(Response.json(401, "jwt")); }
    return response.status(err.code || 500).json(Response.json(err.code || 500, err.type || "any", err));
  });
}

export type Param = {middleware: Middleware, subdomain: string, namespace: string, name: string}
export type Static = {subdomain: string, namespace: string, resource_path: string}
export type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
