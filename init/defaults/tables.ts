import {db, init_chain} from "../../app";
import * as path from "path";
import * as _ from "lodash";
import * as env from "../../env.json";
import Element from "../../classes/Element";
import * as Promise from "bluebird";
import {Include} from "../../modules/Include";

init_chain.addPromise("table", (resolve, reject) =>
  db[env.mode].connect()
  .then(connection => {
    Include({path: path.resolve(__dirname, "../../objects"), transform: (r, v) => _.set(r, v.default.__type, v.default)}).then((res: {[type: string]: typeof Element}) =>
      Promise.all(_.map(res, (object: typeof Element) => object.register()))
      .then(res => resolve(res))
      .catch(err => reject(err))
      .finally(() => connection.close()));
  })
);
