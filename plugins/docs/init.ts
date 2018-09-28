import * as Promise from "bluebird";
import * as _ from "lodash";
import * as path from "path";
import {ePromisePipeStagesInitPublicize, publicize_pipe} from "../../init/publicize";
import {ePromisePipeStagesInitResource, resource_pipe} from "../../init/resource";
import {iDatabasePool} from "../../interfaces/iDatabase";
import * as Application from "../../modules/Application";
import * as Cache from "../../modules/Cache";
import Route from "../../resources/Route";

export const subdomain = "docs";

export enum eAPIDocumentationType {
  "API_DOCUMENTATION"                 = "api/documentation",
  "API_DOCUMENTATION_ROUTE"           = "api/documentation/route",
  "API_DOCUMENTATION_PARAMETER"       = "api/documentation/parameter",
  "API_DOCUMENTATION_RESOURCE"        = "api/documentation/resource",
  "API_DOCUMENTATION_ROUTE_PARAMETER" = "api/documentation/route/parameter"
}

resource_pipe.add(ePromisePipeStagesInitResource.PLUGIN, () => {
  const databases: {[key: string]: iDatabasePool} = {};
  // Promise.map(_.values(Resource.list), resource => {
  //   const name = resource.table.options.resource.database;
  //   const key = _.join([name, "information_schema"], "::");
  //   const database = databases[key] || (databases[key] = Database(key, _.assign({}, env.databases[name], {database: "information_schema"})));
  //   return database.queryOne<iInformationSchemaTable>("SELECT * FROM `INNODB_TABLES` WHERE NAME = ?", env.databases[name].database + "/" + resource.type.replace(/\//g, "@002f"))
  //   .then(table => {
  //     return database.query<iInformationSchemaColumn>("SELECT * FROM `INNODB_COLUMNS` WHERE `TABLE_ID` = ?", table.TABLE_ID)
  //     .then(columns => {
  //       return _.set(table, "columns", columns);
  //     });
  //   })
  //   .catch(err => reject(err));
  // })
  // .then(res => resolve(res));
  //
  return Promise.resolve();
});

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () =>
  Promise.all([
    Application.addStatic(path.resolve(__dirname, "./public"), subdomain),
    Application.addRoute(subdomain, "/", "*", "GET", (request, response) => {
      response.sendFile(path.resolve(__dirname, "./public/index.html"));
    })
  ])
);

publicize_pipe.add(ePromisePipeStagesInitPublicize.PUBLISH, () =>
  Promise.all([
    Cache.getOne<Route>(Cache.types.RESOURCE, Route.type, Cache.keyFromSet([subdomain, "/*", "GET"])).then(route => Application.updateRoute(_.set(route, "flag_active", 1)))
  ])
);
