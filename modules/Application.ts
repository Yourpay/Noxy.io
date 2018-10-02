import * as Promise from "bluebird";
import * as express from "express";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";
import * as vhost from "vhost";
import {env} from "../globals";
import {eApplicationMethods, iApplicationConfiguration, iApplicationNamespace, iApplicationPath, iApplicationService, iApplicationStore, iApplicationSubdomain, tApplicationMiddleware} from "../interfaces/iApplication";
import {eResourceType} from "../interfaces/iResource";
import * as Response from "../modules/Response";
import RoleRoute from "../resources/RoleRoute";
import RoleUser from "../resources/RoleUser";
import Route from "../resources/Route";
import User from "../resources/User";
import * as Cache from "./Cache";
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
        weight: _.reduce(_.tail(namespace.split("/")), (r, v) => r + 10000 + (v.match(/:[a-z]+$/) ? 1 : v.length), 0)
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
        methods: _.reduce(eApplicationMethods, (r, v, k) => _.set(r, k, null), {}),
        weight:  _.reduce(_.tail(namespace.split("/")), (r, v) => r + 10000 + (v.match(/:[a-z]+$/) ? 1 : v.length), 0)
      }
    });
  }
  return store[subdomain].namespaces[namespace].paths[path];
}

function addParam(param: string, subdomain: string, middlewares: tApplicationMiddleware | tApplicationMiddleware[]): boolean;
function addParam(param: string, subdomain: string, namespace: string, middlewares: tApplicationMiddleware | tApplicationMiddleware[]): boolean;
function addParam(param: string, subdomain: string, namespace: string | tApplicationMiddleware | tApplicationMiddleware[], middlewares?: tApplicationMiddleware | tApplicationMiddleware[]): boolean {
  return !!(middlewares ? addNamespace(parseSubdomain(subdomain), parsePath(<string>namespace)).params[param] = _.concat(middlewares) : addSubdomain(parseSubdomain(subdomain)).params[param] = _.concat(middlewares));
}

function addStatic(public_directory_path: string, subdomain: string, namespace?: string) {
  return !!(namespace ? addNamespace(parseSubdomain(subdomain), parsePath(namespace)).static = public_directory_path : addSubdomain(parseSubdomain(subdomain)).static = public_directory_path);
}

function addRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, middlewares: tApplicationMiddleware | tApplicationMiddleware[]): Promise<Route> {
  return new Route({subdomain: subdomain = parseSubdomain(subdomain), namespace: namespace = parsePath(namespace), path: path = parsePath(path), method: method, middleware: _.concat(auth, middlewares, notFound)})
  .save({update_protected: true, collision_fallback: true})
  .tap(res => addPath(subdomain, namespace, path).methods[method] = res);
}

function updateRoute(subdomain: string, namespace: string, path: string, method: eApplicationMethods, middlewares: tApplicationMiddleware | tApplicationMiddleware[]): Promise<Route> {
  if (!store[subdomain].namespaces[namespace].paths[path][method]) { return Promise.reject(Response.error(404, "application")); }
  return Promise.resolve(store[subdomain].namespaces[namespace].paths[path][method]);
}

function parseSubdomain(subdomain: string): string {
  return _.map(_.filter(subdomain.toString().split("."), v => v.length > 0), v => v.substring(0, 62)).join(".").replace(/^[.-]+|[.-]+$|[^a-zA-Z0-9-.]/g, "").substr(0, 253 - configuration.domain.length);
}

function parsePath(path: string): string {
  return (path = path.replace(/^[\/]+|[\/]+$/g, "")).length === 0 ? "/" : path.replace(/\*{2,}/g, "*");
}

function auth(request: express.Request & {vhost: {host: string}}, response: express.Response, next: express.NextFunction) {
  const path = (request.baseUrl + request.route.path).replace(/\/$/, "");
  const subdomain = request.vhost ? request.vhost.host.replace(configuration.domain, "").replace(/[.]*$/, "") : env.subdomains.default;
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

function notFound(request: express.Request, response: express.Response) {
  response.json(Response.json(404, "any"));
}

function publicize() {
  if (configuration.published) { return Promise.reject(Response.error(409, "application")); }
  
  console.log(store);
  console.log(store.api.namespaces);
  console.log(store.api.namespaces.route.paths);
  
  _.each(_.orderBy(store, "weight", "DESC"), (subdomain: iApplicationSubdomain, root) => {
    subdomain.router = express.Router();
    configuration.application.use(vhost(`${root}.${configuration.domain}`, subdomain.router));
    
    _.each(_.orderBy(subdomain.namespaces, "weight", "DESC"), (namespace: iApplicationNamespace, base) => {
      
      _.each(namespace.paths, (path, location) => {
        _.each(namespace.paths, (route, method) => {
        
        });
      });
    });
  });
  
  // let subdomain: express.Router, router: express.Router;
  //
  // if (__published) { return __published; }
  //
  // _.each(_.orderBy(_.uniqBy(_.map(Cache.store[Cache.types.RESOURCE][Route.type], "value"), v => _.join([v.subdomain, v.namespace, v.path, v.method])), ["weight"], ["desc"]), route => {
  //   if (!(subdomain = __subdomains[route.subdomain])) {
  //     subdomain = __subdomains[route.subdomain] = express.Router();
  //     if (route.subdomain !== env.subdomains.default) { __application.use(vhost(route.subdomain + "." + __domain, subdomain)); }
  //   }
  //   if (!(router = _.get(__routers, [route.subdomain, route.namespace]))) {
  //     _.set(__routers, [route.subdomain, route.namespace], router = express.Router());
  //     const static_key = _.join(_.filter([route.subdomain, route.namespace]), "::");
  //     if (__statics[static_key]) { router.use(express.static(__statics[static_key].resource_path)); }
  //     if (__statics[route.subdomain] && !__statics[route.subdomain].namespace) { subdomain.use(express.static(__statics[route.subdomain].resource_path)); }
  //     subdomain.use((request, response, next) => {
  //       response.header("Allow", "PUT, GET, POST, DELETE, OPTIONS");
  //       response.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  //       response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  //       response.header("X-Frame-Options", "DENY");
  //       if (request.get("origin") && _.some(_.keys(__subdomains), subdomain => `${subdomain}.${__domain}` === request.get("origin").replace(/^\w+:\/\//, ""))) {
  //         response.header("Access-Control-Allow-Origin", request.get("origin"));
  //       }
  //       next();
  //     });
  //     subdomain.use(router);
  //   }
  //   return router[_.toLower(route.method)].apply(router, _.concat(<any>route.url, route.middleware));
  // });
  // if (!__routers[env.subdomains.default]) { __subdomains[env.subdomains.default] = express.Router(); }
  // _.each(__params, param => _.each(param.namespace ? [__routers[param.subdomain][param.namespace]] : __routers[param.subdomain], n => n.param(param.name, param.middleware)));
  // __application.use("/", __subdomains[env.subdomains.default]);
  // __application.all("*", (request, response) => response.status(404).json(Response.json(404, "any")));
  // http.createServer(__application).listen(80);
  // return __published = true;
  
  return Promise.resolve(configuration.published = true);
}

const exported: iApplicationService = _.assign(
  Service,
  {
    get store() { return store; },
    get domain() { return configuration.domain; },
    get methods() { return configuration.methods; },
    get published() { return configuration.published; },
    get application() { return configuration.application; },
    addSubdomain: addSubdomain,
    addNamespace: addNamespace,
    addPath:      addPath,
    addParam:     addParam,
    addStatic:    addStatic,
    addRoute:     addRoute,
    updateRoute:  updateRoute,
    publicize:    publicize
  }
);

export = exported;
