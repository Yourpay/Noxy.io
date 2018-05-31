import * as _ from "lodash";
import * as path from "path";
import {db, env, init_queue} from "../../app";
import Element from "../../classes/Element";
import PromiseQueue from "../../classes/PromiseQueue";
import {Include} from "../../modules/Include";

export const db_queue = new PromiseQueue(["register", "create", "alter"]);

db_queue.promise("register", resolve => {
  const options = {
    path:      path.resolve(__dirname, "../../objects"),
    transform: (r, v) => _.set(r, v.default.__type, v.default)
  };
  Include(options).then((elements: {[type: string]: typeof Element}) => _.invokeMap(elements, "register") && resolve());
});

db_queue.promise("create", (resolve, reject) => {
  db[env.mode].connect()
  .then(connection =>
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.databases[env.mode].database}\`;`)
    .then(() =>
      db[env.mode].setDatabase(env.databases[env.mode], connection)
      .then(connection =>
  
        Element.bind(connection)
        .then(res => resolve(res))
        .catch(err => reject(err))
      )
    )
  )
  .catch(err => reject(err));
});

init_queue.promise("db", (resolve, reject) => db_queue.execute().then(res => resolve(res), err => reject(err)));
