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
          const route = {
            path:   (path + layer.route.path).replace(/\/$/, ""),
            method: _.findKey(layer.route.methods, v => v)
          };
          new Route(route).validate()
          .catch(err => err.code === "404.db.select" ? this : reject(err))
          .then(res => {
            if (res.validated) { return resolve(res); }
            res.save()
            .then(res => resolve(res))
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
  
  export function auth(request, response, next) {
    const route_key = `${request.method}:${request.path}`;
    return new Promise<Route>((resolve, reject) => {
      if (__routes[route_key]) { return resolve(__routes[route_key]); }
      return new Route({method: request.method, path: request.baseUrl}).validate().then(res => resolve(res), err => reject(err));
    })
    .then(route => {
      if (!route.flag_active) { return response.sendStatus(404); }
      if (!__roles[route_key]) { return next(); }
      jwt.verify(request.get("Authorization"), env.tokens.jwt, (err, decoded) => {
        if (err) { return response.sendStatus(401); }
        return response.sendStatus(200);
      });
    })
    .catch(err => response.sendStatus(404));
  }
  
  export function addRoute(method: Method, path: string | Path, ...args): typeof Application {
    const parsed_path = _.get(path, "path", path);
    const router = __routers[parsed_path] || (__routers[parsed_path] = express.Router());
    router[_.toLower(method)].apply(router, _.concat(_.get(path, "parameter", "/"), args));
    return Application;
  }
  
  export function addElementRouter(element: Element | any) {
    const path = `/api/${element.__type}`;
    const router = __routers[path] || (__routers[path] = express.Router());
    
    router.param("id", (request: ElementRequest, response, next, id) => {
      request.id = id;
      next();
    });
    
    router.get(`/`, auth, (request, response, next) => {
      console.log("GET PATH HIT");
      response.status(401).json({fuck: "yes"});
    });
    
    router.get(`/:id`, auth, (request, response, next) => {
      console.log("GET PATH HIT");
      response.status(401).json({fuck: "yes"});
    });
    
    router.post(`/`, auth, (request, response) => {
      console.log(request.body);
      return new element(request.body).save()
      .then(res => response.json(res.toObject()))
      .catch(err => response.status(err.code.split(".")[0]).send(err.message));
    });
    
    router.put(`/:id`, auth, (request, response, next) => {
      console.log("GET PATH HIT");
      response.status(401).json({fuck: "yes"});
    });
    
    router.delete(`/:id`, auth, (request, response, next) => {
      console.log("GET PATH HIT");
      response.status(401).json({fuck: "yes"});
    });
    
    __routers[`/api/${element.__type}`] = router;
    return Application;
  }
  
}

interface ElementRequest extends express.Request {
  id?: string
}

type Path = { path: string, parameter: string }
type Method = "GET" | "POST" | "PUT" | "DELETE"
