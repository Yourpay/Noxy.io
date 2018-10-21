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
  const databases = _.reduce(_.values(Resource.list), (result, resource) => _.includes(result, resource.table.options.resource.database) ? result : _.concat(result, resource.table.options.resource.database), []);
  return Promise.mapSeries(databases, database => Database(database).query(`SET FOREIGN_KEY_CHECKS = 0;`))
  .then(() => Promise.mapSeries(_.values(Resource.list), resource => Database(resource.table.options.resource.database).query(resource.table.toSQL())))
  .then(() => Promise.mapSeries(databases, database => Database(database).query(`SET FOREIGN_KEY_CHECKS = 1;`)));
});

database_pipe.add(ePromisePipeStagesInitDatabase.ALTER, () => {
  return Promise.reduce(_.values(Resource.list), (result, resource) => {
    Promise.resolve(resource).then(res => _.set(result, resource.type, res));
  });
  // const databases = _.reduce(_.values(Resource.list), (result, resource) => _.includes(result, resource.table.options.resource.database) ? result : _.concat(result, resource.table.options.resource.database), []);
  // return Promise.map(databases, database => {
  //   return Database(database).query<{[key: string]: string}[]>("SHOW TABLES;")
  //   .reduce((result, table_result) => {
  //     /* TODO: THIS */
  //     const table = _.values(table_result)[0];
  //     return Database(database).query<iMYSQLColumnDescription[]>("DESCRIBE ??.??;", [env.databases[database].database, table])
  //     .reduce((result, definition) => {
  //       const [type, mod_value] = _.tail(definition.Type.match(/^([a-z]+)\((.+)\)$/));
  //       const mod: {[key: string]: string} = {};
  //       if (_.includes(["decimal", "float", "numeric", "double"], type)) {
  //         const [precision, scale] = mod_value.split(",");
  //         mod.precision = precision;
  //         mod.scale = scale;
  //       }
  //       else if (_.includes(["time", "datetime", "timestamp"], type)) {
  //         mod.precision = mod_value;
  //       }
  //       else if (_.includes(["enum", "set"], type)) {
  //         mod.enum = mod_value;
  //       }
  //       return _.set(result, [table, definition.Field], _.assign(mod, {
  //         type:        type,
  //         primary_key: definition.Key === "PRI",
  //         null:        definition.Null === "NO"
  //       }));
  //     }, {});
  //   });
  // })
  // .then(res => console.log(res));
});

init_pipe.add(ePromisePipeStagesInit.DATABASE, () => database_pipe.resolve());

