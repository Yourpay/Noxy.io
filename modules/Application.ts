import Element from "../classes/Element";
import Route from "../objects/Route";
import Role from "../objects/Role";

import * as bodyParser from "body-parser";
import * as Promise from "bluebird";
import * as jwt from "jsonwebtoken";
import * as env from "../env.json";
import * as express from "express";
import * as https from "https";
import * as http from "http";
import * as _ from "lodash";
import * as fs from "fs";
import ServerError from "../classes/ServerError";
import User from "../objects/User";

export namespace Application {
  
  const __roles: { [key: string]: Role[] } = {};
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
  
  export function auth(request, response, next) {
    const route_key = `${request.method}:${request.path}`;
    return new Promise<Route>((resolve, reject) => {
      if (__routes[route_key]) { return resolve(__routes[route_key]); }
      return new Route({method: request.method, path: request.baseUrl}).validate().then(res => resolve(res), err => reject(err));
    })
    .then(route => {
      if (!route.flag_active) { return response.sendStatus(404); }
      new Promise((resolve, reject) => jwt.verify(request.get("Authorization"), env.tokens.jwt, (err, decoded) => !err || !__roles[route_key] ? resolve(decoded) : reject(err)))
      .then(res => {
        if (res) { _.set(request, "user", new User(res)); }
        next();
      })
      .catch(err => response.sendStatus(401));
    })
    .catch(() => response.sendStatus(404));
  }
  
  export function addRoute(method: Method, path: string | Path, ...args): typeof Application {
    const parsed_path = _.get(path, "path", path);
    const router = __routers[parsed_path] || (__routers[parsed_path] = express.Router());
    router[_.toLower(method)].apply(router, _.concat(_.get(path, "parameter", "/"), args));
    return Application;
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
      element.retrieve(request.query.start, request.query.limit, request.user)
      .then(res => response.status(200).json(Application.response(res)))
      .catch(err => response.status(err.code.split(".")[0]).json(Application.response(err)));
    });
    
    router.get(`/:id`, auth, (request, response) => {
      console.log("GET PATH HIT");
      response.status(401).json({fuck: "yes"});
    });
    
    router.post(`/`, auth, (request, response) => {
      const $element = new element(request.body);
      return $element.validate()
      .catch(err => err.code === "404.db.select" ? $element : err)
      .then(res => {
        if (res instanceof ServerError) { throw res; }
        if (res.validated) { throw new ServerError("400.db.duplicate"); }
        res.save()
        .then(res => response.json(Application.response(res.toObject())))
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
    return Application;
  }
  
}

interface ElementRequest extends express.Request {
  id?: string
  user?: User
}

type Path = { path: string, parameter: string }
type Method = "GET" | "POST" | "PUT" | "DELETE"
