import * as Promise from "bluebird";
import * as _ from "lodash";
import * as path from "path";
import {env, init_queue} from "../app";
import PromiseQueue from "../classes/PromiseQueue";
import * as Database from "../modules/Database";
import * as Include from "../modules/Include";
import * as Resource from "../modules/Resource";

export const database_queue = new PromiseQueue(["connect", "register", "create", "alter"]);

database_queue.promise("connect", (resolve, reject) => {
  Database(env.mode, env.databases[env.mode]);
  resolve();
});

database_queue.promise("register", (resolve, reject) =>
  Include({path: path.resolve(__dirname, "../resources")})
  .then(res => resolve(res))
  .catch(err => reject(err))
);

database_queue.promise("create", (resolve, reject) => {
  const databases = {};
  Promise.map(_.values(Resource.list), resource =>
    new Promise((resolve, reject) => {
      if (databases[resource.table.options.resource.database]) { return databases[resource.table.options.resource.database].then(res => resolve(res)).catch(err => reject(err)); }
      databases[resource.table.options.resource.database] = Database(resource.table.options.resource.database).query(`SET FOREIGN_KEY_CHECKS = 0;`)
      .then(res => resolve(res));
    })
    .then(() => Database(resource.table.options.resource.database).query(resource.table.toSQL()))
  )
  .then(() => Promise.map(_.keys(databases), database => Database(database).query(`SET FOREIGN_KEY_CHECKS = 1;`)).then(res => resolve(res)))
  .catch(err => reject(err));
});

database_queue.promise("alter", (resolve, reject) => {
  const databases = {};
  Promise.map(_.values(Resource.list), resource => {
    const name = resource.table.options.resource.database;
    const key = _.join([name, "information_schema"], "::");
    const database = databases[key] || (databases[key] = Database(key, _.assign({}, env.databases[name], {database: "information_schema"})));
    database.query("SELECT * FROM `INNODB_TABLES` WHERE NAME = ?", env.databases[name].database + "/" + resource.type.replace(/\//g, "@002f"))
  })
  .then(res => resolve(res))
  .catch(err => reject(err));
});

init_queue.promise("db", (resolve, reject) => database_queue.execute().then(res => resolve(res), err => reject(err)));

