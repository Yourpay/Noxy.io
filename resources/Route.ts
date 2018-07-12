import * as express from "express";
import * as _ from "lodash";
import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import * as Application from "../modules/Application";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  subdomain:    {type: "varchar(64)", protected: true, required: true, unique_index: ["route"]},
  path:         {type: "varchar(64)", protected: true, required: true, unique_index: ["route"]},
  method:       {type: "enum('GET','POST','PUT','DELETE', 'PATCH')", protected: true, required: true, unique_index: ["route"]},
  flag_active:  {type: "tinyint(1)", default: 0},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
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
  
  public key: string;
  public weight: number;
  public middleware: Middleware[];
  
  constructor(object?: iRouteObject) {
    super(object);
    this.path = ("/" + (object.namespace || "") + object.path).replace(/\/{2,}/g, "/").replace(/(\w)\/$/, "$1");
    this.time_created = object.time_created ? object.time_created : Date.now();
    this.key = `${this.subdomain}::${this.method}::${this.path}`;
    this.weight = _.reduce(_.tail(this.path.split("/")), (r, v) => r + 10000 + (v.match(/:[a-z]+$/) ? 1 : v.length), 0);
  }
  
}

interface iRouteObject {
  id?: string
  path: string
  method: string
  subdomain: string
  namespace?: string
  flag_active?: boolean
  time_created: number
  
  middleware?: Middleware[]
}

type Middleware = (request: express.Request, response: express.Response, next?: express.NextFunction, id?: express.NextFunction) => void