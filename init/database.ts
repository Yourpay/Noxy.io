import * as Promise from "bluebird";
import * as _ from "lodash";
import {env, init_pipe} from "../globals";
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
  const databases = {};
  return Promise.map(_.values(Resource.list), resource => {
    const name = resource.table.options.resource.database;
    const key = _.join([name, "information_schema"], "::");
    const database = databases[key] || (databases[key] = Database(key, _.assign({}, env.databases[name], {database: "information_schema"})));
    database.query("SELECT * FROM `INNODB_TABLES` WHERE NAME = ?", env.databases[name].database + "/" + resource.type.replace(/\//g, "@002f"));
  });
});

init_pipe.add(ePromisePipeStagesInit.DATABASE, () => database_pipe.resolve());

