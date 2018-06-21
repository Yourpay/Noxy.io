import * as Resource from "../classes/Resource";
import * as express from "express";
import * as vhost from "vhost";
import * as _ from "lodash";
import Route from "../resources/Route";
import Promise from "aigle";
import {env} from "../app";
import * as http from "http";

let __published: Promise<any>;
const __methods: Method[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const __roles: {[key: string]: Buffer[]} = {};
const __params: {[key: string]: Param} = {};
const __routes: {[key: string]: Route} = {};
const __routers: {[key: string]: express.Router} = {};
const __application: express.Application = express();

export const routes = new Proxy(__routes, {get: (routes: {[key: string]: Route}, prop: string) => routes[prop]});

export function addParam(subdomain: string, param: string, fn: Middleware)
export function addParam(subdomain: string, ns_pm: string, pm_fn: string | Middleware, fn?: Middleware) {
  const key = _.join(_.filter([subdomain, ns_pm, pm_fn], v => typeof v !== "string"), "::");
  __params[key] = {middleware: fn ? fn : <Middleware>pm_fn, subdomain: subdomain, namespace: fn ? ns_pm : null, name: fn ? <string>pm_fn : ns_pm};
}

export function addRoute(subdomain: string, namespace: string, path: string, method: Method, fn: Middleware[]): Route {
  const route = new Route({subdomain: subdomain, namespace: namespace, path: path, method: method, middleware: fn});
  return __routes[route.key] = route;
}

export function addRoutes(subdomain: string, namespace: string, routes: {[path: string]: {[method: string]: Middleware[]}}): {[key: string]: Route} {
  return _.transform(routes, (r, rt, p) => _.set(r, p, _.transform(rt, (r, mw, m) => _.includes(__methods, m) ? _.set(r, m, addRoute(subdomain, namespace, p, <Method>m, mw)) : r, {})), {});
}

export function addResource(resource: typeof Resource.Constructor) {
  return addRoutes(env.subdomains.api, resource.__type, {
    "/":    {
      "GET":  [(request, response) => resource.get(request.query.start, request.query.limit).then(res => response.status(res.code).json(res))],
      "POST": []
    },
    "/:id": {
      "GET":    [(request, response) => resource.getBy({id: request.query.id}).then(res => response.status(res.code).json(res))],
      "PUT":    [],
      "DELETE": []
    }
  });
}

export function publicize() {
  return __published || (__published = new Promise((resolve, reject) => {
    let subdomain, router;
    Promise.map(_.orderBy(__routes, ["weight"], ["desc"]), route => {
      console.log(route.key);
      if (!(subdomain = __routers[route.subdomain])) {
        console.log("Defining", route.subdomain);
        subdomain = __routers[route.subdomain] = express.Router();
        console.log("Subdomain is default?", route.subdomain === env.subdomains.default);
        if (route.subdomain !== env.subdomains.default) { __application.use(vhost(route.subdomain + ".localhost", subdomain)); }
      }
      if (!(router = __routers[route.subdomain + "::" + route.namespace])) {
        console.log("Defining", route.namespace, "on", route.subdomain);
        router = __routers[route.subdomain + "::" + route.namespace] = express.Router();
        subdomain.use(router);
      }
      router[_.toLower(route.method)].apply(router, _.concat(<any>route.path, route.middleware));
      return route.save();
    })
    .then(() => {
      _.each(__params, param => __routers[param.subdomain + (param.namespace ? "::" + param.namespace : "")].param(param.name, param.middleware));
      if (!__routers[env.subdomains.default]) { __routers[env.subdomains.default] = express.Router(); }
      __application.use("/", __routers[env.subdomains.default]);
      __application.all("*", (request, response) => response.sendStatus(404));
      http.createServer(__application).listen(80);
      resolve();
    })
    .catch(err => console.error(err) || reject(err));
  }));
}

// export function auth(request: express.Request & {vhost: {host: string}}, response: express.Response, next: express.NextFunction) {
//   const path = (request.baseUrl + request.route.path).replace(/\/$/, "");
//   const subdomain = request.vhost ? request.vhost.host.replace(/\.\w*$/, "") : "www";
//   return new Promise<[User, Buffer[], Buffer[]]>((resolve, reject) =>
//     authRoute(request.method, subdomain, path)
//     .then(route => {
//       if (!route.flag_active) {
//         return authUser(request.get("Authorization"))
//         .then(res => _.some(res[1], v => v.equals(Resource.Constructor.bufferFromUuid(env.roles.admin.id))) ? resolve([res[0], res[1], []]) : reject(new Response(403, "any")))
//         .catch(err => reject(err.code === 401 && err.type === "jwt" ? new Response.JSON(404, "any") : err));
//       }
//       authRoleRoute(route)
//       .then(route_roles => {
//         authUser(request.get("Authorization"))
//         .then(res => (route_roles.length === 0 || _.intersection(route_roles, res[1]).length > 0) ? resolve([res[0], res[1], []]) : reject(new Response(403, "any")))
//         .catch(err => err.code === 401 && err.type === "jwt" ? resolve([null, [], route_roles]) : reject(err));
//       });
//     })
//     .catch(err => reject(err))
//   )
//   .then(res => {
//     response.locals.user = res[0];
//     response.locals.roles = {user: res[1], route: res[2]};
//     next();
//   })
//   .catch(err => response.status(err.code).json(HTTPService.response(err)));
// }
//
// function authUser(token): Promise<[User, Buffer[]]> {
//   return new Promise<[User, Buffer[]]>((resolve, reject) =>
//     new Promise<User>((resolve, reject) =>
//       jwt.verify(token, env.tokens.jwt, (err, decoded) =>
//         !err ? resolve(new User(decoded)) : reject(new Response(401, "jwt"))
//       )
//     )
//     .then(user => user.validate().then(user => authRoleUser(user).then(res => resolve([user, res]))))
//     .catch(err => reject(err || new Response(401, "any")))
//   );
// }
//
// function authRoute(method, subdomain, path): Promise<Route> {
//   return new Promise<Route>((resolve, reject) => {
//     const key = `${method}:${subdomain}:${path}`;
//     if (__routes[key]) { return resolve(__routes[key]); }
//     new Route({method: method, subdomain: subdomain, path: path}).validate()
//     .then(res => resolve(__routes[key] = res))
//     .catch(err => reject(err));
//   });
// }
//
// function authRoleRoute(route): Promise<Buffer[]> {
//   return new Promise<Buffer[]>((resolve, reject) => {
//     const key = `${route.method}:${route.path}`;
//     if (__roles[key]) { return resolve(__roles[key]); }
//     Database.namespace("master").query(RoleRoute.__table.selectSQL(0, 1000, {route_id: route.id}))
//     .then(res => resolve(__roles[key] = _.map(res, v => new RoleRoute(v).role_id)))
//     .catch(err => reject(err));
//   });
// }
//
// function authRoleUser(user): Promise<Buffer[]> {
//   return Database.namespace("master").query(RoleUser.__table.selectSQL(0, 1000, {user_id: user.id}))
//   .then(res => _.map(res, v => new RoleUser(v).role_id))
// }

export type Param = {middleware: Middleware, subdomain: string, namespace: string, name: string}
export type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
