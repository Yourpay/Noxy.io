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
    const pool = resource.table.options.resource.database;
    const database = env.databases[pool].database;
    const table = resource.type;
    return Database(pool).queryOne("SHOW CREATE TABLE ??.??", [database, table])
    .then(res => {
      _.each(resource.table.definition, (column, key) => {
        console.log(column);
        console.log(table, Resource.Table.sqlFromColumn(key, column));
      });
      const script = res["Create Table"].replace(/\n\s*/, " ");
      console.log(script);
      // const [table, definition, engine, charset, collation] = _.tail(script.match(/CREATE TABLE\s+`([^`]+)`\s+\(((?:.|\s)+)\)\s+(?:ENGINE=([a-z]+))?\s+(?:DEFAULT\s+CHARSET=([a-z0-9_]+))?\s+(?:COLLATE=([a-z0-9_]+))?/i));
      // const rows = _.map(definition.split(",\n"), row => row.replace(/^\s*|\s$/g, ""));
      // console.log(rows);
      return "";
    });
    
    // return Promise.props({
    //   definitions:
    //     Database(pool).query<iMYSQLColumnDescription[]>(
    //       "DESCRIBE ??.??;",
    //       [database, table]
    //     )
    //     .catch(err => err.code === 404 ? Promise.resolve(<iMYSQLColumnDescription[]>[]) : Promise.reject(Response.error(err.code, err.type, err))),
    //   references:
    //     Database(pool).query<iMYSQLColumnReference[]>(
    //       "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_COLUMN_NAME IS NOT NULL;",
    //       [database, table]
    //     )
    //     .catch(err => err.code === 404 ? Promise.resolve(<iMYSQLColumnReference[]>[]) : Promise.reject(Response.error(err.code, err.type, err)))
    // })
    // .then(res => {
    //   _.each(res.definitions, definition => {
    //     const [type, mod_value] = _.tail(definition.Type.match(/^([a-z]+)\((.+)\)$/));
    //     const mod: {[key: string]: string} = {};
    //     if (_.includes(["decimal", "float", "numeric", "double"], type)) {
    //       const [precision, scale] = mod_value.split(",");
    //       mod.precision = precision;
    //       mod.scale = scale;
    //     }
    //     else if (_.includes(["time", "datetime", "timestamp"], type)) {
    //       mod.precision = mod_value;
    //     }
    //     else if (_.includes(["enum", "set"], type)) {
    //       mod.enum = mod_value;
    //     }
    //     return _.set(result, [table, definition.Field], _.assign(mod, {
    //       type:        type,
    //       primary_key: definition.Key === "PRI",
    //       null:        definition.Null === "NO"
    //     }));
    //   });
    //   _.each(res.references, reference => {
    //
    //     console.log(table, reference)
    //   })
    //   return result;
    // });
  }, {});
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

