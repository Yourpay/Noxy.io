import * as Promise from "bluebird";
import * as _ from "lodash";
import {env, init_pipe} from "../globals";
import {iMYSQLColumnDescription} from "../interfaces/iAuxiliary";
import {ePromisePipeStagesInit} from "../interfaces/iPromisePipe";
import * as Database from "../modules/Database";
import * as Include from "../modules/Include";
import * as PromisePipe from "../modules/PromisePipe";
import * as Resource from "../modules/Resource";

export enum ePromisePipeStagesInitDatabase {
  CONNECT  = 0,
  REGISTER = 1,
  CREATE   = 2,
  ALTER    = 3,
  PLUGIN   = 4
}

const MTYPE = {
  1:  "VARCHAR",
  2:  "CHAR",
  3:  "BINARY",
  4:  "BINARY",
  5:  "BLOB",
  6:  "INT",
  7:  "SYS_CHILD",
  8:  "SYS",
  9:  "FLOAT",
  10: "DOUBLE",
  11: "DECIMAL",
  12: "VARCHAR",
  13: "MYSQL"
};

export const database_pipe = PromisePipe(ePromisePipeStagesInitDatabase);

database_pipe.add(ePromisePipeStagesInitDatabase.CONNECT, () => Promise.resolve(Database(env.mode, env.databases[env.mode])));

database_pipe.add(ePromisePipeStagesInitDatabase.REGISTER, () => Include("./resources"));

database_pipe.add(ePromisePipeStagesInitDatabase.CREATE, () => {
  const databases = {};
  return Promise.map(_.values(Resource.list), resource =>
    new Promise((resolve, reject) => {
      if (databases[resource.table.options.resource.database]) { return databases[resource.table.options.resource.database].then(res => resolve(res)).catch(err => reject(err)); }
      databases[resource.table.options.resource.database] = Database(resource.table.options.resource.database).query(`SET FOREIGN_KEY_CHECKS = 0;`)
      .then(res => resolve(res));
    })
    .then(() => Database(resource.table.options.resource.database).query(resource.table.toSQL()))
  )
  .then(() => Promise.map(_.keys(databases), database => Database(database).query(`SET FOREIGN_KEY_CHECKS = 1;`)));
});

database_pipe.add(ePromisePipeStagesInitDatabase.ALTER, () => {
  const databases = _.reduce(_.values(Resource.list), (result, resource) => _.includes(result, resource.table.options.resource.database) ? result : _.concat(result, resource.table.options.resource.database), []);
  Promise.map(databases, database => {
    return Database(database).query<{[key: string]: string}[]>("SHOW TABLES;")
    .reduce((result, table) => {
      return Database(database).query<iMYSQLColumnDescription[]>("DESCRIBE ??", _.values(table)[0])
      .reduce((result, column) => {
        return _.set(result, column.Field, {
          type:    column.Type,
          null:    column.Null !== "NO",
          default: column.Default
        });
      }, {})
      .then(definition => _.set(result, _.values(table)[0], definition));
    }, {})
    .tap(res => console.log(res));
  });
  return Promise.resolve();
});

// const name = resource.table.options.resource.database;
// const key = _.join([name, "information_schema"], "::");
// const database: iDatabasePool = databases[key] || (databases[key] = Database(key, _.assign({}, env.databases[name], {database: "information_schema"})));
// database.query<iMYSQLTable[]>("SELECT * FROM `INNODB_TABLES` WHERE NAME = ?", env.databases[name].database + "/" + resource.type.replace(/\//g, "@002f"))
// .reduce((result, table) => {
//   return database.query<iMYSQLTableColumn[]>("SELECT * FROM `INNODB_COLUMNS` WHERE TABLE_ID = ?", table.TABLE_ID)
//   .reduce((result, column) => {
//     return _.set(result, column.NAME, {
//       type: MTYPE[column.MTYPE] + "(" + column.LEN + ")",
//     });
//   }, {})
//   .then(columns => _.set(result, resource.type, columns));
// }, {})
// .then(res => console.log(res) || res);

init_pipe.add(ePromisePipeStagesInit.DATABASE, () => database_pipe.resolve());

