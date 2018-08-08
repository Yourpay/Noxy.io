import Promise from "aigle";
import * as _ from "lodash";
import * as path from "path";
import {env, init_queue} from "../app";
import PromiseQueue from "../classes/PromiseQueue";
import Table from "../classes/Table";
import * as Database from "../modules/Database";
import * as Include from "../modules/Include";

export const db_queue = new PromiseQueue(["connect", "register", "create", "alter"]);

db_queue.promise("connect", (resolve, reject) =>
  Promise.map(_.concat(env.databases[env.mode]), database => Database.register(env.mode, database))
  .then(res => resolve(res))
  .catch(err => reject(err))
);

db_queue.promise("register", (resolve, reject) =>
  Include({path: path.resolve(__dirname, "../resources")})
  .then(res => resolve(res))
  .catch(err => reject(err)));

db_queue.promise("create", (resolve, reject) =>
  Promise.map(_.omitBy(Table.tables, (v, k) => k === "coextensive"), (tables, database: string) =>
    Database.namespace(database).query(`SET FOREIGN_KEY_CHECKS=0; ${_.join(_.map(tables, table => table.toSQL()), " ")} SET FOREIGN_KEY_CHECKS=1;`)
  )
  .then(res => resolve(res))
  .catch(err => reject(err))
);

init_queue.promise("db", (resolve, reject) => db_queue.execute().then(res => resolve(res), err => reject(err)));
