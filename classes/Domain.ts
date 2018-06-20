import Endpoint from "./Endpoint";
import * as _ from "lodash";
import * as express from "express";
import * as vhost from "vhost";
import Promise from "aigle";
import Route from "../resources/Route";
import {env} from "../app";
import * as http from "http";

export default class Domain {
  
  private static __live: Promise<any> = null;
  private static __routes: {[key: string]: Route} = {};
  private static __subdomains: {[key: string]: Domain} = {};
  public name: string;
  private __endpoints: {[key: string]: Endpoint} = {};
  
  constructor(subdomain: string) {
    
    if (Domain.__subdomains[subdomain]) { return Domain.__subdomains[subdomain]; }
    Domain.__subdomains[subdomain] = this;
    
    this.name = subdomain;
    
  }
  
  public static get subdomains() {
    return new Proxy(Domain.__subdomains, {
      get: (subdomains: {[key: string]: Domain}, name: string) => {
        return subdomains[name] || (subdomains[name] = new Domain(name));
      }
    });
  }
  
  public get endpoints() {
    return new Proxy(this.__endpoints, {
      get: (endpoints: {[key: string]: Endpoint}, uri: string) => {
        return endpoints[uri] || (endpoints[uri] = new Endpoint(uri));
      }
    });
  }
  
  public static publicize() {
    return Domain.__live || (Domain.__live = new Promise((resolve, reject) => {
      const application = express();
      return Promise.mapValues(Domain.__subdomains, subdomain => {
        const subdomain_application = express();
        return Promise.map(subdomain.__endpoints, endpoint => {
          return Promise.map(endpoint.routes, (methods, path) => {
            return Promise.map(methods, (middlewares: any[], method: Method) => {
              return new Route({subdomain: subdomain.name, path: endpoint.uri + path, method: method}).save()
              .then(res => subdomain_application[_.toLower(res.method)].apply(subdomain_application, _.concat([res.path], middlewares)));
            });
          });
        })
        .then(() => subdomain_application);
      })
      .then(res => {
        _.mapValues(_.omitBy(res, (r, k) => k === env.subdomains.default), (v, k) => console.log(`${k}.localhost`, v) || application.use(vhost(`${k}.localhost`, v)));
        application.use("/", res[env.subdomains.default]);
        application.all("*", (request, response) => response.status(404).send("Could not find anything here"));
        http.createServer(application).listen(80);
      });
    }));
  }
  
}

type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
