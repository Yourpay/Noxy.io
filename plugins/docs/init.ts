import * as Promise from "bluebird";
import * as _ from "lodash";
import * as path from "path";
import {env} from "../../app";
import {publicize_queue} from "../../init/publicize";
import {resource_queue} from "../../init/resource";
import {iDatabasePool} from "../../interfaces/iDatabase";
import * as Application from "../../modules/Application";
import * as Cache from "../../modules/Cache";
import * as Database from "../../modules/Database";
import * as Resource from "../../modules/Resource";
import Route from "../../resources/Route";
import {iInformationSchemaColumn, iInformationSchemaTable} from "./interfaces/iInformationSchema";

export const subdomain = "docs";

export enum eDocumentationType {
  "DOCUMENTATION"       = "documentation",
  "DOCUMENTATION_ROUTE" = "documentation/route"
}

resource_queue.promise(subdomain, (resolve, reject) => {
  const databases: {[key: string]: iDatabasePool} = {};
  Promise.map(_.values(Resource.list), resource => {
    const name = resource.table.options.resource.database;
    const key = _.join([name, "information_schema"], "::");
    const database = databases[key] || (databases[key] = Database(key, _.assign({}, env.databases[name], {database: "information_schema"})));
    return database.queryOne<iInformationSchemaTable>("SELECT * FROM `INNODB_TABLES` WHERE NAME = ?", env.databases[name].database + "/" + resource.type.replace(/\//g, "@002f"))
    .then(table => {
      return database.query<iInformationSchemaColumn>("SELECT * FROM `INNODB_COLUMNS` WHERE `TABLE_ID` = ?", table.TABLE_ID)
      .then(columns => {
        return _.set(table, "columns", columns);
      });
    })
    .catch(err => err);
  })
  .then(res => resolve(res));
  
});

publicize_queue.promise("setup", (resolve, reject) =>
  Promise.all([
    Application.addStatic(path.resolve(__dirname, "./public"), subdomain),
    Application.addRoute(subdomain, "/", "*", "GET", (request, response) => {
      response.sendFile(path.resolve(__dirname, "./public/index.html"));
    })
  ])
  .then(res => resolve(res))
  .error(err => reject(err))
);

publicize_queue.promise("publish", (resolve, reject) =>
  Promise.all([
    Cache.getOne<Route>(Cache.types.RESOURCE, Route.type, Cache.toKey([subdomain, "/*", "GET"])).then(route => Application.updateRoute(_.set(route, "flag_active", 1)))
  ])
  .then(res => resolve(res))
  .catch(err => reject(err))
);