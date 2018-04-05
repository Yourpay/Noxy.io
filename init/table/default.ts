import {db, init_chain} from "../../app";
import * as requireAll from "require-all";
import * as path from "path";
import * as _ from "lodash";
import * as Promise from "bluebird";
import * as env from "../../env.json";
import BaseObject, {iObjectField} from "../../classes/BaseObject";

export default init_chain.addPromise("table", (resolve, reject) => {
  db[env.mode].connect()
  .then(connection => {
    const promises = [];
    _.each(requireAll(path.join(__dirname, "../../objects")), (imports) => {
      _.each(imports, (object: any | typeof BaseObject) => {
        if (!(object.prototype instanceof BaseObject) || (object.prototype instanceof BaseObject && !object.__type)) { return; }
        let query = _.join([
          `CREATE TABLE IF NOT EXISTS \`${object.__type}\` (`,
          _.join(_.map(_.omitBy(object.__fields, "intermediate"), (field, key) => `\`${key}\` ${field.type} NOT NULL`), ", "),
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8"
        ], "");
        console.log(query);
        promises.push(connection.query(query));
      });
    });
    Promise.all(promises)
    .then(res => resolve(res))
    .catch(err => reject(err))
    .finally(() => connection.close());
  })
  .catch(err => reject(err));
})
.then(res => console.log("tables res", res))
.catch(err => console.error("tables err", err));
