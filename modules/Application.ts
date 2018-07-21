import Promise from "aigle";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";
import * as methodOverride from "method-override";
import * as path from "path";
import * as favicon from "serve-favicon";
import * as vhost from "vhost";
import {env} from "../app";
import * as Resource from "../classes/Resource";
import * as Database from "../modules/Database";
import * as Responses from "../modules/Response";
import RoleRoute from "../resources/RoleRoute";
import RoleUser from "../resources/RoleUser";
import Route from "../resources/Route";
import User from "../resources/User";

let __published: Promise<any>;
const __domain: string = env.domains[env.mode];
const __methods: Method[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const __params: {[key: string]: Param} = {};
const __routes: {[key: string]: Route} = {};
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
  const key = _.join(_.filter([subdomain, ns_pm, pm_fn], v => typeof v !== "string"), "::");
  return __params[key] = {middleware: fn ? fn : <Middleware>pm_fn, subdomain: subdomain, namespace: fn ? ns_pm : null, name: fn ? <string>pm_fn : ns_pm};
}

export function addRoute(subdomain: string, namespace: string, path: string, method: Method, fn: Middleware | Middleware[]): Route {
  const route = new Route({subdomain: subdomain, namespace: namespace, path: path, method: method, middleware: [auth].concat(Array.isArray(fn) ? fn : [fn])});
  return __routes[route.key] = route;
}

export function addRoutes(subdomain: string, namespace: string, routes: {[path: string]: {[method: string]: Middleware | Middleware[]}}): {[key: string]: Route} {
  return _.transform(routes, (r, rt, p) => _.set(r, p, _.transform(rt, (r, mw, m) => _.includes(__methods, m) ? _.set(r, m, addRoute(subdomain, namespace, p, <Method>m, mw)) : r, {})), {});
}

export function addResource(resource: typeof Resource.Constructor) {
  return addRoutes(env.subdomains.api, resource.__type, {
    "/":      {
      "GET":  (request, response) => resource.get(request.query.start, request.query.limit).then(res => response.status(res.code).json(res)),
      "POST": []
    },
    "/:id":   {
      "GET":    (request, response) => {
        resource.getBy({id: Resource.Constructor.bufferFromUuid(request.query.id)})
        .catch(err => err instanceof Responses.JSON ? err : new Responses.JSON(404, "any", {id: request.query.id}))
        .then(res => response.status(res.code).json(res));
      },
      "PUT":    [],
      "DELETE": []
    },
    "/count": {
      "GET": (request, response) => resource.count().then(res => response.status(res.code).json(res))
    }
  });
}

export function publicize(): Promise<any> {
  let subdomain: express.Router, router: express.Router;
  return __published || (__published = Promise.map(_.orderBy(__routes, ["weight"], ["desc"]), route => {
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
        response.header("Access-Control-Allow-Origin", `http://admin.${__domain}`);
        response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        next();
      });
      subdomain.use(router);
    }
    router[_.toLower(route.method)].apply(router, _.concat(<any>route.url, route.middleware));
    return route.save();
  }))
  .then(() => {
    if (!__routers[env.subdomains.default]) { __subdomains[env.subdomains.default] = express.Router(); }
    _.each(__params, param => _.each(param.namespace ? [__routers[param.subdomain][param.namespace]] : __routers[param.subdomain], n => n.param(param.name, param.middleware)));
    __application.use("/", __subdomains[env.subdomains.default]);
    __application.all("*", (request, response) => response.sendStatus(404));
    http.createServer(__application).listen(80);
  });
}

function auth(request: express.Request & {vhost: {host: string}}, response: express.Response, next: express.NextFunction): void {
  const path = (request.baseUrl + request.route.path).replace(/\/$/, "");
  const subdomain = request.vhost ? request.vhost.host.replace(__domain, "").replace(/[.]*$/, "") : env.subdomains.default;
  const key = `${subdomain}::${request.method}::${path}`;
  (__routes[key] && __routes[key].exists ? Promise.resolve(<AuthObject>{route: __routes[key]}) : Promise.reject(new Responses.JSON(404, "any")))
  .then(auth => Database.namespace(env.mode).query(RoleRoute.__table.selectSQL(0, 1000, {route_id: auth.route.id})).reduce((r, v: RoleRoute) => r.concat(v.role_id), []).then(roles => _.set(auth, "route_roles", roles)))
  .then(auth => {
    if (!auth.route_roles.length && auth.route.flag_active) { return Promise.resolve(auth); }
    return new User(<any>jwt.verify(request.get("Authorization"), env.tokens.jwt)).validate()
    .then(user => user.exists ? Promise.resolve(_.set(auth, "user", response.locals.user = user)) : Promise.reject(request.get("Authorization")));
  })
  .catch(err => Promise.reject(err instanceof Responses.JSON ? err : new Responses.JSON(401, "jwt", err)))
  .then(auth =>
    !auth.user
    ? Promise.resolve(auth)
    : Database.namespace(env.mode).query(RoleUser.__table.selectSQL(0, 1000, {user_id: auth.user.id})).reduce((r, v: RoleUser) => r.concat(v.role_id), []).then(roles => _.set(auth, "user_roles", roles))
  )
  .then(auth => {
    if (!auth.user) { return Promise.resolve(auth); }
    if (!auth.route.flag_active) { return _.some(auth.user_roles, role => Resource.Constructor.uuidFromBuffer(role) === env.roles.admin.id) ? Promise.resolve(auth) : Promise.reject(new Responses.JSON(404, "any")); }
    if (_.some(auth.route_roles, route_role => _.some(auth.user_roles, user_role => _.isEqual(user_role, route_role)))) { return Promise.resolve(auth); }
    return Promise.reject(new Responses.JSON(403, "any"));
  })
  .then(() => next())
  .catch(err => err instanceof Responses.JSON ? response.status(err.code).json(err) : response.status(500).json(new Responses.JSON(500, "any", err)));
}

export type Param = {middleware: Middleware, subdomain: string, namespace: string, name: string}
export type Static = {subdomain: string, namespace: string, resource_path: string}
export type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

interface AuthObject {
  route: Route
  user_roles: Buffer[]
  route_roles: Buffer[]
  user: User
}
