import * as Promise from "bluebird";
import * as _ from "lodash";
import * as path from "path";
import {env} from "../../app";
import Table from "../../classes/Table";
import {publicize_queue} from "../../init/publicize";
import {resource_queue} from "../../init/resource";
import * as Application from "../../modules/Application";
import * as Cache from "../../modules/Cache";
import * as Database from "../../modules/Database";
import Route from "../../resources/Route";
import {iInformationSchemaColumn, iInformationSchemaTable} from "./interfaces/iInformationSchema";

resource_queue.promise("docs", (resolve, reject) => {

  const databases = {};
  Promise.map(_.values(Table.tables), table => {
    const key = _.join([table.__database, "information_schema"], "::");
    const database = databases[key] || (databases[key] = Database(key, _.assign({}, env.databases[table.__database], {database: "information_schema"})));
    return database.queryOne<iInformationSchemaTable>("SELECT * FROM `INNODB_TABLES` WHERE NAME = ?", env.databases[table.__database].database + "/" + table.__resource.__type.replace(/\//g, "@002f"))
    .then(table => {
      return database.query<iInformationSchemaColumn>("SELECT * FROM `INNODB_COLUMNS` WHERE `TABLE_ID` = ?", table.TABLE_ID)
      .then(columns => {
        return _.set(table, "columns", columns.toObject());
      })
    })
    .catch(err => console.log("err", err) || err);
  })
  .then(res => console.log(res) || resolve(res))
  .catch(err => reject(err));

});

publicize_queue.promise("setup", (resolve, reject) => {
  
  Promise.all([
    Application.addStatic(path.resolve(__dirname, "./public"), "docs"),
    Application.addRoute("docs", "/", "*", "GET", (request, response) => {
      response.sendFile(path.resolve(__dirname, "./public/index.html"));
    })
  ])
  .then(res => resolve(res))
  .error(err => resolve(err));
  
});

publicize_queue.promise("publish", (resolve, reject) => {
  Promise.all([
    Cache.getOne<Route>(Cache.types.RESOURCE, Route.__type, Cache.toKey(["docs", "/*", "GET"])).then(route => Application.updateRoute(route))
  ])
  .then(res => resolve(res))
  .catch(err => reject(err));
  
});