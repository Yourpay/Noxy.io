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

export const database_pipe = PromisePipe(ePromisePipeStagesInitDatabase);

database_pipe.add(ePromisePipeStagesInitDatabase.CONNECT, () => Promise.resolve(Database(env.mode, env.databases[env.mode])));

database_pipe.add(ePromisePipeStagesInitDatabase.REGISTER, () => Include("./resources"));

database_pipe.add(ePromisePipeStagesInitDatabase.CREATE, () => {
  const databases = _.reduce(_.values(Resource.list), (result, resource) => _.includes(result, resource.table.options.resource.database) ? result : _.concat(result, resource.table.options.resource.database), []);
  return Promise.mapSeries(databases, database => Database(database).query(`SET FOREIGN_KEY_CHECKS = 0;`))
  .then(() => Promise.mapSeries(_.values(Resource.list), resource => Database(resource.table.options.resource.database).query(resource.table.toSQL())))
  .then(() => Promise.mapSeries(databases, database => Database(database).query(`SET FOREIGN_KEY_CHECKS = 1;`)));
});

database_pipe.add(ePromisePipeStagesInitDatabase.ALTER, () => {
  const databases = _.reduce(_.values(Resource.list), (result, resource) => _.includes(result, resource.table.options.resource.database) ? result : _.concat(result, resource.table.options.resource.database), []);
  return Promise.map(databases, database => {
    return Database(database).query<{[key: string]: string}[]>("SHOW TABLES;")
    .reduce((result, table) => {
      /* TODO: THIS */
      return Database(database).query<iMYSQLColumnDescription[]>("SHOW CREATE TABLE ??.??;", [env.databases[database].database, _.values(table)[0]])
      .reduce((result, rs) => _.values(rs)[1], {})
      .then(definition => _.set(result, _.values(table)[0], definition));
    }, {});
  })
  .then(res => console.log(res));
});

init_pipe.add(ePromisePipeStagesInit.DATABASE, () => database_pipe.resolve());
