import Promise from "aigle";
import PromiseQueue from "../../classes/PromiseQueue";
import {env, init_queue} from "../../app";
import * as DatabaseService from "../../modules/DatabaseService";
import {Table} from "../../classes/Table";
import {User} from "../../resources/User";
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
  Promise.map(Table.tables, (tables, database) => DatabaseService.namespace(database).query(_.join(_.map(tables, table => table.toSQL()), " ")))
  .then(res => resolve(res))
  .catch(err => reject(err));
});

db_queue.promise("alter", (resolve, reject) => {
  const user = new User({username: "root", password: "testdkjeslk423ewdsf", email: "admin@localhost"});
  console.log("User:", user);
  user.validate()
  .then(res => console.log("result", res))
  .catch(err => console.error("err", err));
  resolve();
});

init_queue.promise("db", (resolve, reject) => db_queue.execute().then(res => resolve(res), err => reject(err)));

