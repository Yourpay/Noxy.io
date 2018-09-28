import * as express from "express";
import * as _ from "lodash";
import {env} from "../globals";
import {ePromisePipeStagesInitPublicize, publicize_pipe} from "../init/publicize";
import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType} from "../interfaces/iResource";
import * as Application from "../modules/Application";
import * as Resource from "../modules/Resource";
import * as Response from "../modules/Response";
import Database = require("../modules/Database");

const definition = {
  subdomain:    {type: "varchar(64)", protected: true, required: true, unique_index: "route"},
  path:         {type: "varchar(64)", protected: true, required: true, unique_index: "route"},
  namespace:    {type: "varchar(64)", protected: true, required: true, unique_index: "route"},
  method:       {type: "enum('GET','POST','PUT','DELETE', 'PATCH')", protected: true, required: true, unique_index: "route"},
  flag_active:  {type: "tinyint(1)", default: "0"},
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class Route extends Resource.Constructor {
  
  public path: string;
  public method: Application.Method;
  public subdomain: string;
  public namespace: string;
  public flag_active: boolean;
  public time_created: number;
  public time_updated: number;
  
  public url: string;
  public key: string;
  public weight: number;
  public middleware: Middleware[];
  
  constructor(initializer: tNonFnPropsOptional<Route> = {}) {
    super(initializer);
    this.path = initializer.path || "/";
    this.namespace = initializer.namespace || "/";
    this.url = ("/" + initializer.namespace + initializer.path).replace(/\/{2,}/g, "/").replace(/(\w)\/$/, "$1");
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
    this.key = `${this.subdomain}::${this.method}::${this.url}`;
    this.weight = _.reduce(_.tail(this.url.split("/")), (r, v) => r + 10000 + (v.match(/:[a-z]+$/) ? 1 : v.length), 0);
  }
  
}

Resource<eResourceType>(eResourceType.ROUTE, Route, definition, options);

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () =>
  Application.addRoute(env.subdomains.api, Route.type, "/", "GET", (request, response) => {
    const start = request.query.start > 0 ? +request.query.start : 0, limit = request.query.limit > 0 && request.query.limit < 100 ? +request.query.limit : 100;
    return Database(env.mode).query<{subdomain: string, namespace: string}[]>("SELECT DISTINCT subdomain, namespace FROM `route` LIMIT ? OFFSET ?", [limit, start])
    .reduce((result: any, route) => {
      return Database(env.mode).query<tNonFnPropsOptional<Route>>("SELECT * FROM `route` WHERE `subdomain` = ? AND `namespace` = ?", [route.subdomain, route.namespace])
      .map(route => new Route(route).toObject())
      .then(routes => _.concat(result, {subdomain: route.subdomain, namespace: route.namespace, routes: routes}));
    }, [])
    .then(routes => Response.json(200, "any", routes))
    .catch(err => err instanceof Response.json ? err : Response.json(500, "any", err))
    .then(res => response.status(res.code).json(res));
  })
);

type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void