import {db, init_chain} from "../../app";
import * as env from "../../env.json";

init_chain.addPromise("db", (resolve, reject) => {
  db[env.mode].connect()
  .then(connection => {
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.databases[env.mode].database}\`; `)
    .then(() => {
      db[env.mode].setDatabase(env.databases[env.mode])
      .then(res => resolve(res))
      .catch(err => reject(err))
      .finally(() => connection.close());
    })
    .catch(err => reject(err));
  })
  .catch(err => reject(err));
});
