import * as express from "express";
import * as Resource from "./Resource";
import * as _ from "lodash";

export default class Endpoint {
  
  private readonly __uri: string;
  private readonly __routes: {[uri: string]: {[method: string]: Middleware[]}} = {};
  
  constructor(uri: string) {
    this.__uri = uri;
  }
  
  public get uri() {
    return this.__uri;
  }
  
  public get routes() {
    return new Proxy(this.__routes, {
      get: (routes: {[uri: string]: {[method: string]: Middleware[]}}, uri: string) => {
        return new Proxy(routes[uri], {
          get: (middleware: {[method: string]: Middleware[]}, method: string) => {
            return middleware[method];
          }
        });
      }
    });
  }
  
  public addResource(resource: typeof Resource.Constructor) {
    _.set(this, ["__routes", `/${resource.__type}`, "GET"], (request, response) => resource.get(request.query.start, request.query.limit, {}));
  }
  
  public addRoute(method: Method, uri: string, ...fn: Middleware[]): this {
    return _.set(this, ["__routes", uri, method], fn);
  }
  
}

type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// export default class Endpoint {

// private static __live: Promise<any> = null;
// private static __roles: {[key: string]: Buffer[]} = {};
// private static __routes: {[key: string]: Resource.Constructor} = {};
// private static __servers: {[key: string]: http.Server | https.Server} = {};
// private static __endpoints: {[subdomain: string]: {[path: string]: Endpoint}} = {};
// private static __application: express.Application = express();
// private static __certificates: {[key: string]: object} = {};
//
// public readonly __uri: string;
// public readonly __subdomain: string;
// private __router: express.Router = express.Router();
// private __params: {[id: string]: EndpointFunction} = {};
// private __routes: {[uri: string]: {[method: string]: EndpointFunction[]}} = {};

// constructor(subdomain: string, uri: string) {
// if (!_.get(Endpoint, ["__endpoints", subdomain, uri])) { _.set(Endpoint, ["__endpoints", subdomain, uri], this); }
// this.__subdomain = subdomain;
// this.__uri = uri;
// }

//
// public static get endpoints(): {[subdomain: string]: {[path: string]: Endpoint}} {
//   return _.clone(Endpoint.__endpoints);
// }
//
// public static get roles(): {[key: string]: Buffer[]} {
//   return _.clone(Endpoint.__roles);
// }
//
// public static get routes(): {[key: string]: Resource.Constructor} {
//   return _.clone(Endpoint.__routes);
// }

// public static publicize(): Promise<any> {
//   return Endpoint.__live || (Endpoint.__live = new Promise((resolve, reject) => {
//     const Route = require(path.resolve(__dirname, "../resources/Route.js"))["default"];
//     return Promise.map(Endpoint.__endpoints, (endpoints: {[key: string]: Endpoint}, subdomain: string) => {
//       const subdomain_router = express.Router();
//       return Promise.map(endpoints, (endpoint: Endpoint, uri: string) => {
//         const router = endpoint.__router;
//         return Promise.map(endpoint.__routes, (routes: {[id: string]: EndpointFunction[]}, path: string) =>
//           Promise.map(routes, (fn: EndpointFunction[], method: string) =>
//             new Route({method: method, path: `/${uri}/${path}`.replace(/\/{2,}/g, "/").replace(/\/$/g, ""), subdomain: subdomain}).save()
//             .then(res => (Endpoint.__routes[`${res.subdomain}::${res.path}::${res.method}`] = res) && router[_.toLower(method)](path, fn))
//           )
//         )
//         .then(() => subdomain_router.use(uri, router));
//       })
//       .then(() => ({path: subdomain, router: subdomain_router}));
//     })
//     .then((res: {path: string, router: express.Router}[]) => {
//       const subdomains = _.reject(res, v => v.path === env.subdomains.default);
//       const base = _.find(res, v => v.path === env.subdomains.default);
//
//       _.each(subdomains, subdomain => Endpoint.__application.use(vhost(`${subdomain.path}.localhost`, subdomain.router)));
//       Endpoint.__application.use("/", base ? base.router : express());
//       Endpoint.__application.all("*", (request, response) => response.status(404).send("Could not find anything here"));
//
//       if (env.ports.https && !Endpoint.__servers[env.ports.https]) {
//         try {
//           _.each(env.certificates, (path, type) => _.merge(Endpoint.__certificates, _.set({}, type, fs.readFileSync(path))));
//           if (Endpoint.__certificates.pfx || (Endpoint.__certificates.key && Endpoint.__certificates.cert)) {
//             Endpoint.__servers[env.ports.https] = https.createServer(Endpoint.__certificates, Endpoint.__application);
//             Endpoint.__servers[env.ports.https].listen(env.ports.https);
//           }
//           else {
//             console.error("HTTPS port enabled, but lacking proper certificates to create HTTPS server.");
//           }
//         }
//         catch (e) {
//           console.error("ERROR", e);
//         }
//       }
//
//       if (env.ports.http && !Endpoint.__servers[env.ports.http]) {
//         const server = http.createServer(Endpoint.__servers[env.ports.https] ? express().all("*", (request, response) => response.redirect("https://" + request.hostname + request.url)) : Endpoint.__application);
//         Endpoint.__servers[env.ports.http] = server.listen(env.ports.http);
//       }
//       resolve();
//     })
//     .catch(err => console.error(err) || reject(err));
//   }));
// }
//
// public static response(response: express.Response, object: ServerMessage) {
//   response.status(object.code).json({
//     success:   object.code === 200,
//     message:   object.message,
//     data:      object.item,
//     time:      Date.now(),
//     reference: object.code + "::" + object.type
//   });
// }
//
// public static auth(request: express.Request & {vhost: {host: string}}, response: express.Response, next: express.NextFunction) {
//   const path = (request.baseUrl + request.route.path).replace(/\/$/, "");
//   const subdomain = request.vhost ? request.vhost.host.replace(/\.\w*$/, "") : "www";
//   return new Promise<[User, Buffer[], Buffer[]]>((resolve, reject) =>
//     Endpoint.authRoute(request.method, subdomain, path)
//     .then(route => {
//       if (!(<any>route).flag_active) {
//         return Endpoint.authUser(request.get("Authorization"))
//         .then(res => _.some(res[1], v => v.equals(app.roles["admin"].id)) ? resolve([res[0], res[1], []]) : reject(new ServerMessage(403, "any")))
//         .catch(err => reject(err.code === 401 && err.type === "jwt" ? new ServerMessage(404, "any") : err));
//       }
//       Endpoint.authRoleRoute(route)
//       .then(route_roles => {
//         Endpoint.authUser(request.get("Authorization"))
//         .then(res => (route_roles.length === 0 || _.intersection(route_roles, res[1]).length > 0) ? resolve([res[0], res[1], []]) : reject(new ServerMessage(403, "any")))
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
// private static authUser(token): Promise<[User, Buffer[]]> {
//   return new Promise<[User, Buffer[]]>((resolve, reject) =>
//     new Promise<User>((resolve, reject) =>
//       jwt.verify(token, env.tokens.jwt, (err, decoded) =>
//         !err ? resolve(new User(decoded)) : reject(new ServerMessage(401, "jwt"))
//       )
//     )
//     .then(user => user.validate().then(user => Endpoint.authRoleUser(user).then(res => resolve([user, res]))))
//     .catch(err => reject(err || new ServerMessage(401, "any")))
//   );
// }
//
// private static authRoute(method, subdomain, path): Promise<Resource.Constructor> {
//   return new Promise((resolve, reject) => {
//     const key = `${method}:${subdomain}:${path}`;
//     if (Endpoint.__routes[key]) { return resolve(Endpoint.__routes[key]); }
//     new Resource.Constructor({method: method, subdomain: subdomain, path: path}).validate()
//     .then(res => resolve(Endpoint.__routes[key] = res))
//     .catch(err => reject(err));
//   });
// }
//
// private static authRoleRoute(route): Promise<Buffer[]> {
//   return new Promise<Buffer[]>((resolve, reject) => {
//     const key = `${route.method}:${route.path}`;
//     if (Endpoint.__roles[key]) { return resolve(Endpoint.__roles[key]); }
//     RoleRoute.get(0, 1000, {route_id: route.id})
//     .then(res => resolve(Endpoint.__roles[key] = _.map(res, v => v.role_id)))
//     .catch(err => reject(err));
//   });
// }
//
// private static authRoleUser(user): Promise<Buffer[]> {
//   return RoleUser.get(0, 1000, {user_id: user.id}).then(res => _.map(res, v => v.role_id));
// }
//
// public addResource(resource: typeof Resource.Constructor): this {
//   return this
//   .addRoute("GET", "/", Endpoint.auth, (request, response) => resource.get(request.query).then(res => Endpoint.response(response, new ServerMessage(200, "any", res)), err => Endpoint.response(response, err)));
// }
//
// public addRoute(method: method, uri: string, ...fn: EndpointFunction[]): this {
//   return _.set(this, ["__routes", uri, method], fn);
// }
//
// public addParam(param: string, fn: EndpointFunction): this {
//   return _.set(this, ["__params", param], fn);
// }

// }
