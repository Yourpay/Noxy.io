import * as body_parser from "body-parser";
import * as express from "express";
import Promise from "aigle";
import * as https from "https";
import * as http from "http";
import * as jwt from "jsonwebtoken";
import * as vhost from "vhost";
import * as _ from "lodash";
import * as app from "../app";
import {env} from "../app";
import ServerMessage from "../classes/ServerMessage";
import User from "../objects/User";
import Route from "../objects/Route";
import RoleRoute from "../objects/RoleRoute";
import RoleUser from "../objects/RoleUser";
import * as fs from "fs";

export namespace HTTPService {
  
  const __roles: {[key: string]: Buffer[]} = {};
  const __routes: {[key: string]: Route} = {};
  const __servers: {[port: number]: http.Server | https.Server} = {};
  const __subdomains: {[subdomain: string]: HTTPSubdomain} = {};
  const __application: express.Application = express();
  const __certificates: {[key: string]: object} = {};
  
  __application.use(body_parser.urlencoded({extended: false}));
  __application.use(body_parser.json());
  
  export function roles() {
    return _.clone(__roles);
  }
  
  export function routes() {
    return _.clone(__routes);
  }
  
  export function subdomain(subdomain: string, statics?: string) {
    if (!/^(?:\*|[a-z][\w]{1,7})(?:\.[a-z][\w]{1,7})?$|^$/.test(subdomain)) { throw new ServerMessage(500, "test", {test_message: "Subdomain does not follow the standard.", test: subdomain}); }
    return __subdomains[subdomain] || (__subdomains[subdomain] = new HTTPSubdomain(subdomain, statics));
  }
  
  export function listen() {
    return new Promise((resolve) => {
      Promise.all(_.map(__subdomains, (subdomain: HTTPSubdomain, path) => register(subdomain)))
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
  
  function register(subdomain: HTTPSubdomain): Promise<{path: string, router: express.Router}> {
    const subdomain_app = express.Router();
    if (subdomain.static) { subdomain_app.use(express.static(subdomain.static)); }
    return Promise.all(_.map(subdomain.routers, (router: HTTPRouter, path) => {
      const router_app = express.Router();
      const promises = [];
      return new Promise<express.Router>((resolve, reject) => {
        _.each(router.params, (middleware, identifier) => router_app.param(identifier, middleware));
        _.each(router.endpoints, (endpoint, path) =>
          _.each(endpoint, (middlewares, method) =>
            promises.push(new Promise((resolve, reject) => {
              const route = new Route({
                path:      router.path + _.trimEnd(path, "/"),
                method:    _.toUpper(method),
                subdomain: subdomain.name
              });
              const key = `${route.method}:${route.subdomain}:${route.path}`;
              if (__routes[key]) { return resolve(__routes[key]); }
              route.validate()
              .then(res => res.exists ? resolve(__routes[key] = res) : res.save()
                .then(res => resolve(__routes[key] = res))
                .catch(err => reject(err))
              )
              .catch(err => reject(err));
              router_app[_.toLower(method)].apply(router_app, _.concat(<any>path, middlewares));
            }))
          )
        );
        Promise.all(promises).then(() => resolve(router_app)).catch(err => reject(err));
      }).then(res => subdomain_app.use(path, res));
    }))
    .then(() => ({path: subdomain.name, router: subdomain_app}));
  }
  
  class HTTPSubdomain {
    
    private readonly __name: string;
    private readonly __static: string;
    private readonly __routers: {[path: string]: HTTPRouter};
    
    constructor(subdomain: string, statics?: string) {
      this.__name = subdomain;
      this.__static = statics;
      this.__routers = {};
    }
    
    public get name() {
      return this.__name;
    }
    
    public get static() {
      return this.__static;
    }
    
    public get routers(): {[path: string]: HTTPRouter} {
      return _.clone(this.__routers);
    }
    
    public router(path: string): HTTPRouter {
      if (this.__routers[path]) { return this.__routers[path]; }
      return this.__routers[path] = new HTTPRouter(path);
    }
  }
  
  class HTTPRouter {
    
    private readonly __path: string;
    private readonly __endpoints: {[endpoint: string]: {[method: string]: ExpressFunction[]}};
    private readonly __params: {[param: string]: ExpressFunction};
    
    constructor(path: string) {
      this.__path = path;
      this.__endpoints = {};
      this.__params = {};
    }
    
    public get path() {
      return this.__path;
    }
    
    public get endpoints(): {[endpoint: string]: {[method: string]: ExpressFunction[]}} {
      return _.clone(this.__endpoints);
    }
    
    public get params(): {[param: string]: ExpressFunction} {
      return _.clone(this.__params);
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
  }
  
  export function auth(request: express.Request & {vhost: {host: string}}, response: express.Response, next: express.NextFunction) {
    const path = (request.baseUrl + request.route.path).replace(/\/$/, "");
    const subdomain = request.vhost ? request.vhost.host.replace(/\.\w*$/, "") : "www";
    return new Promise<[User, Buffer[], Buffer[]]>((resolve, reject) =>
      authRoute(request.method, subdomain, path)
      .then(route => {
        if (!route.flag_active) {
          return authUser(request.get("Authorization"))
          .then(res => _.some(res[1], v => v.equals(app.roles["admin"].id)) ? resolve([res[0], res[1], []]) : reject(new ServerMessage(403, "any")))
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

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type ExpressFunction = (request: express.Request, response: express.Response, next: express.NextFunction) => void
