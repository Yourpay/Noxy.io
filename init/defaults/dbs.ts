import {db, init_chain} from "../../app";
import * as env from "../../env.json";
import Element from "../../classes/Element";
import PromiseChain from "../../classes/PromiseChain";

export const db_chain = new PromiseChain();

export const db_queue =

init_chain.addPromise("db", (resolve, reject) => {
  
  
  // db_chain.addPromise("init", (resolve, reject) => {
  //   console.log("db init running");
    db[env.mode].connect()
    .then(connection =>
      connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.databases[env.mode].database}\`; `)
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
  // });
  
  // db_chain.addPromise("post", (resolve, reject) => {
  //   console.log("db post running");
  //   resolve();
  // });
  //
  //
  // console.log("db init added");
  //
  // init_chain.getLinkPromise("db").then(() => db_chain.cycle().then(res => resolve(res)).catch(err => reject(err)));
  //
  
});