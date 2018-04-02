import {db, init_chain} from "../../app";
import DBPool from "../../classes/DBPool";
import * as env from "../../env.json";

export default init_chain.addPromise("db", (resolve, reject) => {
  try {
    db[env.mode] = new DBPool(env.databases[env.mode]);
    resolve();
  }
  catch (e) {
    reject(e);
  }
});
