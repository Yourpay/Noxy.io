import {db, init_chain} from "../../app";
import * as requireAll from "require-all";
import * as path from "path";
import * as _ from "lodash";
import * as env from "../../env.json";
import BaseObject from "../../classes/BaseObject";
import * as Promise from "bluebird";

interface iBaseObjectFile {
  [key: string]: {
    [key: string]: any
    default: {
      __type: string
      __fields: object,
      __indexes: object,
      __relations: object
      prototype: Function
    }
  }
}

init_chain.addPromise("table", (resolve, reject) =>
  db[env.mode].connect()
  .then(connection => {
    const files: iBaseObjectFile = requireAll(path.resolve(__dirname, "../../objects"));
    const objects: { [key: string]: BaseObject } = _.transform(files, (r, v) => v.default.prototype instanceof BaseObject && v.default.__type && _.set(r, v.default.__type, v.default) || r, {});
    Promise.all(_.map(_.pickBy(objects, object => _.size(object.__relations) === 0), object => connection.query(object.generateTableSQL())))
    .then(() => {
      Promise.all(_.map(_.pickBy(objects, object => _.size(object.__relations) > 0), object => connection.query(object.generateTableSQL())))
      .then(res => resolve(res))
      .catch(err => reject(err))
      .finally(() => connection.close());
    })
    .catch(err => reject(err));
  })
  .catch(err => reject(err))
);
