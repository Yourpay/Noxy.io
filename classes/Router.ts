import * as express from "express";
import * as _ from "lodash";

export default abstract class Router {
  
  protected application = express.Router();
  protected path: string;
  protected weight: number;
  protected routers: { [key: string]: Router } = {};
  protected routes: iRouteCollection;
  
  private __finalized: boolean = false;
  
  protected constructor(path: string, weight: number) {
    this.path = path;
    this.weight = weight;
  }
  
  public addRoute(method: Method, path: string, ...route: express.Handler[]): this {
    if (this.__finalized) { return this; }
    return _.set(this, `routes.${method}.${path}`, route);
  }
  
  public removeRoute(method: Method, path: string, ...route: express.Handler[]): this {
    if (this.__finalized) { return this; }
    _.unset(this, `routes.${method}.${path}`);
    return this;
  }
  
  public finalize(): this {
    _.each(this.routes, (routing, method) => {
      _.each(routing, (handler, path) => {
        this.application.apply(null, _.concat(method, path, <any>handler));
      });
    });
    this.__finalized = true;
    return this;
  }
  
};

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface iRouteCollection {
  [key: string]: { [key: string]: express.Handler[] }
  
  "GET": { [key: string]: express.Handler[] }
  "POST": { [key: string]: express.Handler[] }
  "PUT": { [key: string]: express.Handler[] }
  "DELETE": { [key: string]: express.Handler[] }
}
