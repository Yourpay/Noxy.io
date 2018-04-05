import {db, init_chain} from "../../app";
import * as env from "../../env.json";
import DB from "../../classes/DB";

export default init_chain.addPromise("db", (resolve, reject) => {
  db[env.mode].connect()
  .then(connection => {
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.databases[env.mode].database}\`; `)
    .then(res => {
      db[env.mode].setDatabase(env.databases[env.mode])
      .then(res => resolve(res))
      .catch(err => reject(res))
      .finally(() => connection.close());
    })
    .catch(err => reject(err));
  })
  .catch(err => reject(err));
});
