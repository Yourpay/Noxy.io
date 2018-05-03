import * as bodyParser from "body-parser";
import * as Promise from "bluebird";
import * as jwt from "jsonwebtoken";
import * as env from "../env.json";
import * as express from "express";
import * as https from "https";
import * as http from "http";
import * as _ from "lodash";
import * as fs from "fs";

import {roles} from "../app";
import ServerError from "../classes/ServerError";
import RoleRoute from "../objects/RoleRoute";
import RoleUser from "../objects/RoleUser";
import Element from "../classes/Element";
import Route from "../objects/Route";
import Role from "../objects/Role";
import User from "../objects/User";

export namespace RoutingService {
  
  const __roles: { [key: string]: Buffer[] } = {};
  const __routes: { [key: string]: Route } = {};
  const __routers: { [key: string]: express.Router } = {};
  const __servers: { [port: number]: http.Server | https.Server } = {};
  const __application: express.Application = express();
  const __certificates: { [key: string]: object } = {};
  
  __application.use(bodyParser.urlencoded({extended: false}));
  __application.use(bodyParser.json());
  
  export function listen(port?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      Promise.all(_.map(__routers, (router, path) => new Promise((resolve, reject) => {
        Promise.all(_.map(router.stack, layer => new Promise((resolve, reject) => {
          const route = new Route({
            path:   (path + layer.route.path).replace(/\/$/, ""),
            method: _.toUpper(_.findKey(layer.route.methods, v => v))
          });
          const route_key = `${route.path}:${route.method}`;
          if (__routes[route_key]) { return resolve(__routes[route_key]); }
          route.validate()
          .catch(err => err.code === "404.db.select" ? route : err)
          .then(res => {
            if (res instanceof Error) { return reject(res); }
            if (res.validated) { return resolve(res); }
            res.save()
            .then(res => resolve(_.set(__routes, route_key, res)))
            .catch(err => reject(err));
          });
        })))
        .then(res => __application.use(path, router) && resolve(res))
        .catch(err => reject(err));
      })))
      .catch(err => reject(err))
      .then(res => {
        if (!port && !__servers[env.ports.http]) {
          __servers[env.ports.http] = http.createServer(__application).listen(env.ports.http);
        }
        if (!port && !__servers[env.ports.https]) {
          try {
            _.merge(__certificates, _.mapValues(env.certificates, path => fs.readFileSync(path)));
            __servers[env.ports.http] = https.createServer(__certificates, __application).listen(env.ports.https);
          }
          catch (e) {
            console.error("Could not initialize https server. Following error given:");
            console.error(e);
          }
        }
        resolve(res);
      });
    });
  }
  
  export function response(object) {
    return {
      success: !(object instanceof ServerError),
      content: object,
      code:    object.code || "200.server.any",
      message: object.message || "Request performed successfully.",
      time:    Date.now()
    };
  }
  
  function authUser(token): Promise<[User, Buffer[]]> {
    return new Promise<[User, Buffer[]]>((resolve, reject) =>
      new Promise<User>((resolve, reject) =>
        jwt.verify(token, env.tokens.jwt, (err, decoded) =>
          !err ? resolve(new User(decoded)) : reject(new ServerError("401.server.jwt"))
        )
      )
      .then(user => user.validate().then(user => authRoleUser(user).then(res => resolve([user, res]))))
      .catch(err => reject(err || new ServerError("401.server.any")))
    );
  }
  
  function authRoute(method, path, key): Promise<Route> {
    return new Promise<Route>((resolve, reject) => {
      if (__routes[key]) { return resolve(__routes[key]); }
      new Route({method: method, path: path}).validate()
      .then(res => resolve(__routes[key] = res))
      .catch(err => reject(err));
    });
  }
  
  function authRoleRoute(route): Promise<Buffer[]> {
    return new Promise<Buffer[]>((resolve, reject) => {
      const key = `${route.method}:${route.path}`;
      if (__roles[key]) { return resolve(__roles[key]); }
      RoleRoute.retrieve(0, 1000, {route_id: route.id})
      .then(res => resolve(__roles[key] = _.map(res, v => v.role_id)))
      .catch(err => reject(err));
    });
  }
  
  function authRoleUser(user): Promise<Buffer[]> {
    return RoleUser.retrieve(0, 1000, {user_id: user.id}).then(res => _.map(res, v => v.role_id));
  }
  
  export function auth(request, response, next) {
    const path = (request.baseUrl + request.route.path).replace(/\/$/, "");
    const key = `${request.method}:${path}`;
    return new Promise<[User, Buffer[], Buffer[]]>((resolve, reject) =>
      authRoute(request.method, path, key)
      .then(route => {
        if (!route.flag_active) {
          return authUser(request.get("Authorization"))
          .then(res => _.some(res[1], v => v.equals(roles["admin"].id)) ? resolve([res[0], res[1], []]) : reject(new ServerError("403.server.any")))
          .catch(err => reject(err));
        }
        authRoleRoute(route)
        .then(route_roles => {
          authUser(request.get("Authorization"))
          .then(res => (route_roles.length === 0 || _.intersection(route_roles, res[1]).length > 0) ? resolve([res[0], res[1], []]) : reject(new ServerError("403.server.any")))
          .catch(err => err.code === "401.server.jwt" ? resolve([null, [], route_roles]) : reject(err));
        });
      })
      .catch(err => reject(err))
    )
    .then(res => {
      request.user = res[0];
      request.roles_user = res[1];
      request.roles_route = res[2];
      next();
    })
    .catch(err => response.status(err.code.split(".")[0]).json(RoutingService.response(err)));
  }
  
  export function addRoute(method: Method, path: string | Path, ...args): typeof RoutingService {
    const parsed_path = _.get(path, "path", path);
    const router = __routers[parsed_path] || (__routers[parsed_path] = express.Router());
    router[_.toLower(method)].apply(router, _.concat(_.get(path, "parameter", "/"), args));
    return RoutingService;
  }
  
  export function addElementRouter(element: typeof Element | any) {
    const path = `/api/${element.__type}`;
    const router = __routers[path] || (__routers[path] = express.Router());
    router.param("id", (request: ElementRequest, response, next, id) => {
      request.id = id;
      next();
    });
    
    router.get(`/`, auth, (request: ElementRequest, response) => {
      if (request.query.start < 0) { request.query.start = 0; }
      if (request.query.limit < 0 || request.query.limit > 100) { request.query.limit = 100; }
      element.retrieve(request.query.start, request.query.limit, {user_created: request.user.id})
      .then(res => response.status(200).json(RoutingService.response(_.transform(res, (r, v: any) => (v = new element(v).toObject()) && _.set(r, v.id, v), {}))))
      .catch(err => response.status(err.code.split(".")[0]).json(RoutingService.response(err)));
    });
    
    router.get(`/:id`, auth, (request: ElementRequest, response) => {
      new element(request.id).validate()
      .then(res => {
        if (element.__fields.user_created && request.user.id === res.user_created) { return response.status(403).json(RoutingService.response(new ServerError("403.server.any"))); }
        response.status(200).json(RoutingService.response(res.toObject()));
      })
      .catch(err => response.status(err.code.split(".")[0]).json(RoutingService.response(err)));
    });
    
    router.post(`/`, auth, (request, response) => {
      const $element = new element(request.body);
      return $element.validate()
      .catch(err => err.code === "404.db.select" ? $element : err)
      .then(res => {
        if (res instanceof ServerError) { throw res; }
        if (res.validated) { throw new ServerError("400.db.duplicate"); }
        res.save()
        .then(res => response.json(RoutingService.response(res.toObject())))
        .catch(err => response.status(err.code.split(".")[0]).send(err.message));
      })
      .catch(err => response.status(err.code.split(".")[0]).send(err.message));
    });
    
    router.put(`/:id`, auth, (request, response) => {
      
      
      console.log("GET PATH HIT");
      response.status(401).json({fuck: "yes"});
    });
    
    router.delete(`/:id`, auth, (request, response) => {
      console.log("GET PATH HIT");
      response.status(401).json({fuck: "yes"});
    });
    
    __routers[`/api/${element.__type}`] = router;
    return RoutingService;
  }
  
}

interface ElementRequest extends express.Request {
  id?: string
  user?: User
  roles_route?: Role[]
  roles_user?: Role[]
}

type Path = { path: string, parameter: string }
type Method = "GET" | "POST" | "PUT" | "DELETE"
