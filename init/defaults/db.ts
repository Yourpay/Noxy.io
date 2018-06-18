import Promise from "aigle";
import PromiseQueue from "../../classes/PromiseQueue";
import {env, init_queue} from "../../app";
import * as DatabaseService from "../../modules/DatabaseService";
import {Table} from "../../classes/Table";
import * as _ from "lodash";
import * as Include from "../../modules/Include";
import * as path from "path";

export const db_queue = new PromiseQueue(["connect", "register", "create", "alter"]);

db_queue.promise("connect", (resolve, reject) =>
  Promise.map(env.databases, (set, namespace) => Promise.map(Array.isArray(set) ? set : [set], database => DatabaseService.register(<string>namespace, database)))
  .then(res => resolve(res))
  .catch(err => reject(err))
);

db_queue.promise("register", (resolve, reject) => {
  Include({path: path.resolve(__dirname, "../../resources")})
  .then(res => resolve(res))
  .catch(err => reject(err));
});

db_queue.promise("create", (resolve, reject) => {
  Promise.map(Table.tables, (tables, database: string) => DatabaseService.namespace(database).query(`SET FOREIGN_KEY_CHECKS=0; ${_.join(_.map(tables, table => table.toSQL()), " ")} SET FOREIGN_KEY_CHECKS=1;`))
  .then(res => resolve(res))
  .catch(err => reject(err));
});

init_queue.promise("db", (resolve, reject) => db_queue.execute().then(res => resolve(res), err => reject(err)));
