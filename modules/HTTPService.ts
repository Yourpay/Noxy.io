import * as body_parser from "body-parser";
import * as express from "express";
import * as Promise from "bluebird";
import * as https from "https";
import * as http from "http";
import * as jwt from "jsonwebtoken";
import * as vhost from "vhost";
import * as _ from "lodash";
import * as env from "../env.json";
import ServerMessage from "../classes/ServerMessage";
import User from "../objects/User";
import Route from "../objects/Route";
import RoleRoute from "../objects/RoleRoute";
import RoleUser from "../objects/RoleUser";
import {roles} from "../app";
import * as fs from "fs";

export namespace HTTPService {
  
  const __roles: {[key: string]: Buffer[]} = {};
  const __params: IParams = {"*": {}};
  const __routes: {[key: string]: Route} = {};
  const __servers: {[port: number]: http.Server | https.Server} = {};
  const __subdomains: {[subdomain: string]: HTTPSubdomain} = {};
  const __application: express.Application = express();
  
  const __certificates: {[key: string]: object} = {};
  const __methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  
  __application.use(body_parser.urlencoded({extended: false}));
  __application.use(body_parser.json());
  
  export function subdomain(subdomain: string) {
    if (!/^(?:\*|[a-z][\w]{1,7})(?:\.[a-z][\w]{1,7})?$|^$/.test(subdomain)) { throw new ServerMessage(500, "test", {test_message: "Subdomain does not follow the standard.", test: subdomain}); }
    return __subdomains[subdomain] || (__subdomains[subdomain] = new HTTPSubdomain(subdomain));
  }
  
  export function listen() {
    return new Promise((resolve, reject) => {
      Promise.all(_.map(__subdomains, (subdomain, path) => subdomain.listen().then(res => ({path: path, router: res}))))
      .then((res: {path: string, router: express.Router}[]) => {
        const subdomains = _.reject(res, v => v.path === "www");
        const base = _.find(res, v => v.path === "www");
        
        _.each(subdomains, subdomain => __application.use(vhost(`${subdomain.path}.localhost`, subdomain.router)));
        __application.use("/", base.router);
        __application.all("*", (request, response) => response.sendStatus(404));
        
        if (env.ports.https && !__servers[env.ports.https]) {
          Promise.all(_.map(env.certificates, (path, key) => new Promise((resolve, reject) => fs.readFile(path, (err, data) => err ? reject(err) : resolve({[key]: data})))))
          .then(res => {
            _.each(res, v => _.merge(__certificates, v));
            if (!__certificates.pfx || (!__certificates.key && !__certificates.cert)) { throw new Error("HTTPS server port enabled, but no valid certificates were provided."); }
            __servers[env.ports.https] = https.createServer(__certificates, __application);
            // WebSocketService.register(__servers[env.ports.https]);
            __servers[env.ports.https].listen(env.ports.https);
          })
          .catch(err => console.error("ERROR", err));
        }
        
        if (env.ports.http && !__servers[env.ports.http]) {
          if (__servers[env.ports.https]) {
            const __application = express();
            __application.all("*", (request, response) => response.redirect("https://" + request.hostname + request.url));
            __servers[env.ports.http] = http.createServer(__application).listen(env.ports.http);
          }
          else {
            __servers[env.ports.http] = __application.listen(env.ports.http);
            // __servers[env.ports.http] = http.createServer(__application);
            // WebSocketService.register(__servers[env.ports.https]);
            // __servers[env.ports.http].listen(env.ports.http);
          }
        }
        
        resolve();
      })
      .catch(err => console.error("EWWOR", err));
    });
  }
  
  export function response(object) {
    return {
      success: !(object instanceof ServerMessage),
      content: object,
      code:    object.code || 200,
      type:    object.type || "any",
      message: object.message || "Request performed successfully.",
      time:    Date.now()
    };
  }
  
  class HTTPSubdomain {
    
    private __subdomain: string;
    private __routers: {[path: string]: HTTPRouter};
    
    constructor(subdomain: string) {
      this.__subdomain = subdomain;
      this.__routers = {};
    }
    
    public router(path: string): HTTPRouter {
      if (this.__routers[path]) { return this.__routers[path]; }
      return this.__routers[path] = new HTTPRouter(path);
    }
    
    public listen(): Promise<express.Router> {
      const application = express.Router();
      return new Promise((resolve, reject) =>
        Promise.all(_.map(this.__routers, (router, path) => router.listen(this.__subdomain).then(res => application.use(path, res))))
        .then(() => resolve(application))
        .catch(err => reject(err))
      );
    }
    
  }
  
  class HTTPRouter {
    
    private __path: string;
    private __endpoints: {[endpoint: string]: {[method: string]: ExpressFunction[]}};
    private __params: {[param: string]: ExpressFunction};
    
    constructor(path: string) {
      this.__path = path;
      this.__endpoints = {};
      this.__params = {};
    }
    
    public param(param: string, handler: ExpressFunction) {
      if (!this.__params[param]) { this.__params[param] = handler; }
      return this;
    }
    
    public endpoint(method: Method, endpoint: string, ...middlewares: ExpressFunction[]): this {
      if (!this.__endpoints[endpoint]) { this.__endpoints[endpoint] = {}; }
      if (!this.__endpoints[endpoint][method]) { this.__endpoints[endpoint][method] = middlewares; }
      return this;
    }
    
    public listen(subdomain: string): Promise<express.Router> {
      const application = express.Router();
      const promises = [];
      return new Promise((resolve, reject) => {
        _.each(this.__params, (middleware, identifier) => application.param(identifier, middleware));
        _.each(this.__endpoints, (endpoint, path) =>
          _.each(endpoint, (middlewares, method) =>
            promises.push(new Promise((resolve, reject) => {
              //TODO: Store route
              const route = new Route({
                path:      this.__path + _.trimEnd(path, "/"),
                method:    _.toUpper(method),
                subdomain: subdomain
              });
              const key = `${route.method}:${route.subdomain}:${route.path}`;
              
              if (__routes[key]) { return resolve(__routes[key]); }
              route.validate()
              .then(res => res.exists ? resolve(res) : res.save()
                .then(res => resolve(__routes[key] = res))
                .catch(err => reject(err))
              )
              .catch(err => reject(err));
              application[_.toLower(method)].apply(application, _.concat(<any>path, middlewares));
            }))
          )
        );
        Promise.all(promises)
        .then(() => resolve(application))
        .catch(err => reject(err));
      });
    }
  }
  
  export function auth(request: express.Request & {vhost: {host: string}}, response: express.Response, next: express.NextFunction) {
    const path = (request.baseUrl + request.route.path).replace(/\/$/, "");
    const subdomain = request.vhost ? request.vhost.host.replace(/\.\w*$/, "") : "www";
    return new Promise<[User, Buffer[], Buffer[]]>((resolve, reject) =>
      authRoute(request.method, subdomain, path)
      .then(route => {
        if (!route.flag_active) {
          return authUser(request.get("Authorization"))
          .then(res => _.some(res[1], v => v.equals(roles["admin"].id)) ? resolve([res[0], res[1], []]) : reject(new ServerMessage(403, "any")))
          .catch(err => reject(err.code === 401 && err.type === "jwt" ? new ServerMessage(404, "any") : err));
        }
        authRoleRoute(route)
        .then(route_roles => {
          authUser(request.get("Authorization"))
          .then(res => (route_roles.length === 0 || _.intersection(route_roles, res[1]).length > 0) ? resolve([res[0], res[1], []]) : reject(new ServerMessage(403, "any")))
          .catch(err => err.code === 401 && err.type === "jwt" ? resolve([null, [], route_roles]) : reject(err));
        });
      })
      .catch(err => reject(err))
    )
    .then(res => {
      response.locals.user = res[0];
      response.locals.roles = {user: res[1], route: res[2]};
      next();
    })
    .catch(err => response.status(err.code).json(HTTPService.response(err)));
  }
  
  function authUser(token): Promise<[User, Buffer[]]> {
    return new Promise<[User, Buffer[]]>((resolve, reject) =>
      new Promise<User>((resolve, reject) =>
        jwt.verify(token, env.tokens.jwt, (err, decoded) =>
          !err ? resolve(new User(decoded)) : reject(new ServerMessage(401, "jwt"))
        )
      )
      .then(user => user.validate().then(user => authRoleUser(user).then(res => resolve([user, res]))))
      .catch(err => reject(err || new ServerMessage(401, "any")))
    );
  }
  
  function authRoute(method, subdomain, path): Promise<Route> {
    return new Promise<Route>((resolve, reject) => {
      const key = `${method}:${subdomain}:${path}`;
      if (__routes[key]) { return resolve(__routes[key]); }
      new Route({method: method, subdomain: subdomain, path: path}).validate()
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
  
}

type Path = {route?: string, subroute?: string}
type Method = "GET" | "POST" | "PUT" | "DELETE"
type ExpressFunction = (request: express.Request, response: express.Response, next: express.NextFunction) => void

interface IRoutes {
  [subdomain: string]: {
    [route: string]: {
      [subroute: string]: {
        [method: string]: (request: express.Request, response: express.Response, next: express.NextFunction) => void
      }
    }
  }
}

interface IParams {
  [subdomain: string]: ExpressFunction | {
    [route: string]: ExpressFunction
  }
}

