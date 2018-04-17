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
    const files: iBaseObjectFile = requireAll(path.join(__dirname, "../../objects"));
    const objects: { [key: string]: BaseObject } = _.transform(files, (r, v) => v.default.prototype instanceof BaseObject && v.default.__type && _.set(r, v.default.__type, v.default) || r, {});
    const promises = [];
    // _.each(), (imports: ) => {
    //   _.each(_.omitBy(imports, v => v.__relations), (object: typeof BaseObject) => {
    //     if (!(object.prototype instanceof BaseObject) || (object.prototype instanceof BaseObject && !object.__type)) { return; }
    //     const columns = _.map(_.omitBy(object.__fields, "intermediate"), (field, key) => mysql.format(`?? ${field.type} NOT NULL`, [key]));
    //     const primary = mysql.format(`PRIMARY KEY (${_.join(Array(object.__primary.length).fill("??"))})`, object.__primary);
    //     const indexes = _.map(object.__indexes, (index_set, type) =>
    //       _.join(_.map(index_set, (index, key) => `${_.upperCase(type)} \`${key}\` (\`${_.join(index, "`, `")}\`)`))
    //     );
    //     const relations = _.map(object.__relations, (relation, column) =>
    //       `CONSTRAINT \`${object.__type}:${column}\` FOREIGN KEY (\`${column}\`) REFERENCES \`${relation.table}\` (\`id\`) ON DELETE ${relation.on_delete} ON UPDATE ${relation.on_update}`
    //     );
    //     let query = `CREATE TABLE IF NOT EXISTS \`${object.__type}\` (${_.trimEnd(_.join([columns, primary, indexes, relations]), ",")}) ENGINE=InnoDB DEFAULT CHARSET=utf8`;
    //     console.log(query);
    //     promises.push(connection.query(query));
    //   });
    // });
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
