import * as _ from "lodash";
import Promise from "aigle";
import {env, init_queue} from "../../app";
import PromiseQueue from "../../classes/PromiseQueue";
import * as DatabaseService from "../../modules/DatabaseService";

export const db_queue = new PromiseQueue(["connect", "register", "create", "alter"]);

db_queue.promise("connect", resolve => {
  _.each(env.databases, (set, namespace) => _.each(Array.isArray(set) ? set : [set], database => DatabaseService.register(namespace, database)));
  resolve();
});

db_queue.promise("create", (resolve, reject) => {
  Promise.each(DatabaseService.namespaces(), namespace => namespace.all("CREATE DATABASE IF NOT EXISTS ?;", [_.map(namespace.databases, db => db.config.database)]))
  .then(res => resolve(res))
  .catch(err => reject(err));
});

init_queue.promise("db", (resolve, reject) => db_queue.execute().then(res => resolve(res), err => reject(err)));
