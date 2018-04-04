import {db, init_chain} from "../../app";
import {default as DB} from "../../classes/DBPool";
import * as env from "../../env.json";
import * as _ from "lodash";
import * as Promise from "bluebird";

export default init_chain.addPromise("db", (resolve, reject) => {
  Promise.all(_.map(env.databases, (env_db, key) => new Promise((resolve, reject) => {
    db[key] = new DB(env_db);
    return (env.mode !== key) ? resolve(db[key]) : db[key].connect()
    .then(connection => {
      new Promise((resolve, reject) => {
        connection.query(`CREATE DATABASE IF NOT EXISTS \`${env_db.database}\`;`)
        .then(res => resolve(res))
        .catch(err => reject(err));
      });
    })
    .catch(err => reject(err));
  })));
});
