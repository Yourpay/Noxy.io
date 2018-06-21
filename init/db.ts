import * as Database from "../modules/DatabaseService";
import * as Include from "../modules/Include";
import PromiseQueue from "../classes/PromiseQueue";
import Table from "../classes/Table";
import {env, init_queue} from "../app";
import * as path from "path";
import * as _ from "lodash";
import Promise from "aigle";

export const db_queue = new PromiseQueue(["connect", "register", "create", "alter"]);

db_queue.promise("connect", (resolve, reject) =>
  Promise.map(env.databases, (set, namespace) => Promise.map(Array.isArray(set) ? set : [set], database => Database.register(<string>namespace, database)))
  .then(res => resolve(res))
  .catch(err => reject(err))
);

db_queue.promise("register", (resolve, reject) => {
  Include({path: path.resolve(__dirname, "../resources")})
  .then(res => resolve(res))
  .catch(err => reject(err));
});

db_queue.promise("create", (resolve, reject) => {
  Promise.map(Table.tables, (tables, database: string) =>
    Database.namespace(database).query(`SET FOREIGN_KEY_CHECKS=0; ${_.join(_.map(_.reject(tables, t => t.__options.coextensive), table => table.toSQL()), " ")} SET FOREIGN_KEY_CHECKS=1;`)
  )
  .then(res => resolve(res))
  .catch(err => reject(err));
});

init_queue.promise("db", (resolve, reject) => db_queue.execute().then(res => resolve(res), err => reject(err)));
