import * as express from "express";
import * as _ from "lodash";
import {env} from "../app";
import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import {publicize_queue} from "../init/publicize";
import * as Application from "../modules/Application";
import * as Database from "../modules/Database";
import * as Responses from "../modules/Response";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  subdomain:    {type: "varchar(64)", protected: true, required: true, unique_index: ["route"]},
  path:         {type: "varchar(64)", protected: true, required: true, unique_index: ["route"]},
  namespace:    {type: "varchar(64)", protected: true, required: true, unique_index: ["route"]},
  method:       {type: "enum('GET','POST','PUT','DELETE', 'PATCH')", protected: true, required: true, unique_index: ["route"]},
  flag_active:  {type: "tinyint(1)", default: "0"},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn(null, true)
};

@Resources.implement<Resources.iResource>()
export default class Route extends Resources.Constructor {
  
  public static readonly __type: string = "route";
  public static readonly __table: Table = new Table(Route, options, columns);
  
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
  
  constructor(object?: iRouteObject) {
    super(object);
    this.path = object.path || "/";
    this.namespace = object.namespace || "/";
    this.url = ("/" + object.namespace + object.path).replace(/\/{2,}/g, "/").replace(/(\w)\/$/, "$1");
    this.time_created = object.time_created ? object.time_created : Date.now();
    this.key = `${this.subdomain}::${this.method}::${this.url}`;
    this.weight = _.reduce(_.tail(this.url.split("/")), (r, v) => r + 10000 + (v.match(/:[a-z]+$/) ? 1 : v.length), 0);
  }
  
}

publicize_queue.promise("setup", resolve => {
  Application.addRoute(env.subdomains.api, Route.__type, "/", "GET", (request, response) => {
    const start = request.query.start > 0 ? +request.query.start : 0, limit = request.query.limit > 0 && request.query.limit < 100 ? +request.query.limit : 100;
    Database.namespace(env.mode).query("SELECT DISTINCT subdomain, namespace FROM `route` LIMIT ? OFFSET ?", [limit, start])
    .reduce((result: any, route) => {
      return Database.namespace(env.mode).query("SELECT * FROM `route` WHERE `subdomain` = ? AND `namespace` = ?", [route.subdomain, route.namespace])
      .then(routes => _.concat(result, {subdomain: route.subdomain, namespace: route.namespace, routes: _.map(routes, route => new Route(route).toObject())}));
    }, [])
    .then(routes => new Responses.JSON(200, "any", routes))
    .catch(err => err instanceof Responses.JSON ? err : new Responses.JSON(500, "any", err))
    .then(res => response.status(res.code).json(res));
  });
  resolve();
});

interface iRouteObject {
  id?: string
  path: string
  method: string
  subdomain: string
  namespace?: string
  flag_active?: boolean
  time_created?: number
  
  middleware?: Middleware[]
}

type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void