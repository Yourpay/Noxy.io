import * as bodyParser from "body-parser";
import * as SocketIO from "socket.io";
import * as Promise from "bluebird";
import * as jwt from "jsonwebtoken";
import * as env from "../env.json";
import * as express from "express";
import * as https from "https";
import * as http from "http";
import * as _ from "lodash";
import * as fs from "fs";

import {roles} from "../app";
import {WebSocketService} from "./WebSocketService";
import ServerError from "../classes/ServerError";
import RoleRoute from "../objects/RoleRoute";
import RoleUser from "../objects/RoleUser";
import Element from "../classes/Element";
import Route from "../objects/Route";
import Role from "../objects/Role";
import User from "../objects/User";

export namespace HTTPService {
  
  const __roles: { [key: string]: Buffer[] } = {};
  const __routes: { [key: string]: Route } = {};
  const __routers: { [key: string]: express.Router } = {};
  const __servers: { [port: number]: http.Server | https.Server } = {};
  const __application: express.Application = express();
  const __certificates: { [key: string]: object } = {};
  
  __application.use(bodyParser.urlencoded({extended: false}));
  __application.use(bodyParser.json());
  
  export function listen(): Promise<any> {
    return new Promise((resolve, reject) =>
      Promise.all(_.map(__routers, (router, path) => new Promise((resolve, reject) =>
        Promise.all(_.map(router.stack, layer => new Promise((resolve, reject) => {
          const route = new Route({
            path:   (path + layer.route.path).replace(/\/$/, ""),
            method: _.toUpper(_.findKey(layer.route.methods, v => v))
          });
          const route_key = `${route.path}:${route.method}`;
          if (__routes[route_key]) { return resolve(__routes[route_key]); }
          route.validate()
          .then(res => res.exists ? resolve(res) : res.save()
            .then(res => resolve(_.set(__routes, route_key, res)))
            .catch(err => reject(err))
          )
          .catch(err => reject(err));
        })))
        .then(res => __application.use(path, router) && resolve(res))
        .catch(err => reject(err)))))
      .catch(err => reject(err))
      .then(res => {
        if (env.ports.https && !__servers[env.ports.https]) {
          Promise.all(_.map(env.certificates, (path, key) => new Promise((resolve, reject) => fs.readFile(path, (err, data) => err ? reject(err) : resolve({[key]: data})))))
          .then(res => {
            _.each(res, v => _.merge(__certificates, v));
            if (!__certificates.pfx || (!__certificates.key && !__certificates.cert)) { throw new Error("HTTPS server port enabled, but no valid certificates were provided."); }
            __servers[env.ports.https] = https.createServer(__certificates, __application);
            WebSocketService.register(__servers[env.ports.https]);
            __servers[env.ports.https].listen(env.ports.https);
          })
          .catch(err => console.error(err));
        }
        if (env.ports.http && !__servers[env.ports.http]) {
          if (__servers[env.ports.https]) {
            const __application = express();
            __application.all("*", (request, response) => response.redirect("https://" + request.hostname + request.url));
            __servers[env.ports.http] = http.createServer(__application).listen(env.ports.http);
          }
          else {
            __servers[env.ports.http] = http.createServer(__application);
            WebSocketService.register(__servers[env.ports.https]);
            __servers[env.ports.http].listen(env.ports.http);
          }
        }
        
        resolve(res);
      })
    );
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
    .catch(err => response.status(err.code.split(".")[0]).json(HTTPService.response(err)));
  }
  
  export function addRoute(method: Method, path: string | Path, ...args): typeof HTTPService {
    const parsed_path = _.get(path, "path", path);
    const router = __routers[parsed_path] || (__routers[parsed_path] = express.Router());
    router[_.toLower(method)].apply(router, _.concat(_.get(path, "parameter", "/"), args));
    return HTTPService;
  }
  
  export function addElementRouter(element: typeof Element | any) {
    const path = `/api/${element.__type}`;
    const router = __routers[path] || (__routers[path] = express.Router());
    router.param("id", (request: ElementRequest, response, next, id) => {
      request.id = id;
      next();
    });
    
    router.get(`/`, auth, (request: ElementRequest, response) =>
      new Promise((resolve, reject) => {
        if (request.query.start < 0) { request.query.start = 0; }
        if (request.query.limit < 0 || request.query.limit > 100) { request.query.limit = 100; }
        element.retrieve(request.query.start, request.query.limit, {user_created: request.user.id})
        .then(res => resolve(_.transform(res, (r, v: any) => (v = new element(v).toObject()) && _.set(r, v.id, v), {})))
        .catch(err => reject(err));
      })
      .then(res => response.json(HTTPService.response(res)))
      .catch(err => response.status(err.code.split(".")[0]).json(HTTPService.response(err)))
    );
    
    router.get(`/:id`, auth, (request: ElementRequest, response) => {
      new Promise((resolve, reject) => {
        new element(request.id).validate()
        .then(res => !element.__fields.user_created || request.user.id === res.user_created ? resolve(res.toObject()) : reject(new ServerError("404.server.any")))
        .catch(err => reject(err));
      })
      .then(res => response.json(HTTPService.response(res)))
      .catch(err => response.status(err.code.split(".")[0]).json(HTTPService.response(err)));
    });
    
    router.post(`/`, auth, (request: ElementRequest, response) =>
      new Promise((resolve, reject) =>
        new element(request.body).validate()
        .then(res =>
          res.exists ? reject(new ServerError("400.db.duplicate")) : res.save(request.user)
          .then(res => resolve(res.toObject()))
          .catch(err => reject(err))
        )
        .catch(err => reject(err))
      )
      .then(res => response.json(HTTPService.response(res)))
      .catch(err => response.status(err.code.split(".")[0]).json(HTTPService.response(err)))
    );
    
    router.put(`/:id`, auth, (request: ElementRequest, response) =>
      new Promise((resolve, reject) =>
        new element(request.body).validate()
        .then(res =>
          !res.exists || (element.__fields.user_created && request.user.id === res.user_created) ? reject(new ServerError("404.db.any")) : res.save(request.user)
          .then(res => resolve(res.toObject()))
          .catch(err => reject(err))
        )
        .catch(err => reject(err))
      )
      .then(res => response.json(HTTPService.response(res)))
      .catch(err => response.status(err.code.split(".")[0]).json(HTTPService.response(err)))
    );
    
    router.delete(`/:id`, auth, (request: ElementRequest, response) =>
      new Promise((resolve, reject) =>
        new element(request.body).validate()
        .then(res =>
          !res.exists || (element.__fields.user_created && request.user.id === res.user_created) ? reject(new ServerError("404.db.any")) : res.remove(request.user)
          .then(res => resolve(res.toObject()))
          .catch(err => reject(err))
        )
        .catch(err => reject(err))
      )
      .then(res => response.json(HTTPService.response(res)))
      .catch(err => response.status(err.code.split(".")[0]).json(HTTPService.response(err)))
    );
    
    __routers[`/api/${element.__type}`] = router;
    return HTTPService;
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
