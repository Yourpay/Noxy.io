import * as Promise from "bluebird";
import * as _ from "lodash";
import * as path from "path";
import {env, init_queue} from "../app";
import PromiseQueue from "../classes/PromiseQueue";
import Table from "../classes/Table";
import * as Database from "../modules/Database";
import * as Include from "../modules/Include";

export const db_queue = new PromiseQueue(["connect", "register", "create", "alter"]);

db_queue.promise("connect", (resolve, reject) => {
  Database(env.mode, env.databases[env.mode]);
  resolve();
});

db_queue.promise("register", (resolve, reject) =>
  Include({path: path.resolve(__dirname, "../resources")})
  .then(res => resolve(res))
  .catch(err => reject(err))
);

db_queue.promise("create", (resolve, reject) => {
  /* SHOULD HANDLE DATABASE CREATING AND FOREIGN KEY CHECKS SOMEHOW */
  Promise.map(_.values(Table.tables), table =>
    Database(table.__database).query(_.join([
      "SET FOREIGN_KEY_CHECKS = 0",
      table.toSQL(),
      "SET FOREIGN_KEY_CHECKS = 1"
    ], ";"))
  )
  .then(res => resolve(res))
  .catch(err => reject(err));
});

db_queue.promise("alter", (resolve, reject) => {
  const databases = {};
  Promise.map(_.values(Table.tables), table => {
    const key = _.join([table.__database, "information_schema"], "::");
    const database = databases[key] || (databases[key] = Database(key, _.assign({}, env.databases[table.__database], {database: "information_schema"})));
    database.query("SELECT * FROM `INNODB_TABLES` WHERE NAME = ?", env.databases[table.__database].database + "/" + table.__resource.__type.replace(/\//g, "@002f"))
    .then(res => console.log(res))
    .catch(err => console.log("err", err) || err);
  })
  .then(res => resolve(res))
  .catch(err => reject(err));
});

init_queue.promise("db", (resolve, reject) => db_queue.execute().then(res => resolve(res), err => reject(err)));
