import {db, init_chain} from "../../app";
import * as env from "../../env.json";
import Element from "../../classes/Element";

init_chain.addPromise("db", (resolve, reject) =>
  db[env.mode].connect()
  .then(connection =>
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.databases[env.mode].database}\`; `)
    .then(() =>
      db[env.mode].setDatabase(env.databases[env.mode], connection)
      .then(res =>
        Element.bind(connection)
        .then(() => resolve(res))
        .catch(err => reject(err))
      )
    )
  )
  .catch(err => reject(err))
);
