import {eApplicationMethods, tApplicationMiddleware} from "../interfaces/iApplication";
import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";

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
  public method: eApplicationMethods;
  public subdomain: string;
  public namespace: string;
  public flag_active: boolean;
  public time_created: number;
  public time_updated: number;
  
  public url: string;
  public key: string;
  public weight: number;
  public middleware: tApplicationMiddleware[];
  
  constructor(initializer: tNonFnPropsOptional<Route> = {}) {
    super(initializer);
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
  }
  
}

Resource<eResourceType>(eResourceType.ROUTE, Route, definition, options);

// publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () => {
//   const Application = require("../modules/Application");
//   return Application.addRoute(env.subdomains.api, Route.type, "/", Application.methods.GET, (request, response) => {
//     const start = request.query.start > 0 ? +request.query.start : 0, limit = request.query.limit > 0 && request.query.limit < 100 ? +request.query.limit : 100;
//     return Database(env.mode).query<{subdomain: string, namespace: string}[]>("SELECT DISTINCT subdomain, namespace FROM `route` LIMIT ? OFFSET ?", [limit, start])
//     .reduce((result: any, route) => {
//       return Database(env.mode).query<tNonFnPropsOptional<Route>>("SELECT * FROM `route` WHERE `subdomain` = ? AND `namespace` = ?", [route.subdomain, route.namespace])
//       .map(route => new Route(route).toObject())
//       .then(routes => _.concat(result, {subdomain: route.subdomain, namespace: route.namespace, routes: routes}));
//     }, [])
//     .then(routes => Response.json(200, "any", routes))
//     .catch(err => err instanceof Response.json ? err : Response.json(500, "any", err))
//     .then(res => response.status(res.code).json(res));
//   })
// });
