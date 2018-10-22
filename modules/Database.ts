import * as Promise from "bluebird";
import * as _ from "lodash";
import * as mysql from "mysql";
import {database_pipe, ePromisePipeStagesInitDatabase} from "../init/database";
import {iDatabaseConfig, iDatabasePool, iDatabaseQueryConfig, iDatabaseService} from "../interfaces/iDatabase";
import * as Response from "./Response";

const Service = Default;
const store: {[key: string]: iDatabasePool} = {};
const cluster: mysql.PoolCluster = mysql.createPoolCluster();

function Default(id: string, config?: DatabaseMasterEnvironmental): iDatabasePool {
  const pool = store[id];
  if (config) { return pool ? update(id, config) : add(id, config); }
  if (pool) { return pool; }
  throw Response.error(404, "pool", {id: id});
}

function add(id: string, config: DatabaseEnvironmental): DatabasePool {
  const pool = store[id];
  if (pool) { throw Response.error(409, "db_add", {id: id}); }
  return _.get(Object.defineProperty(store, id, {value: new DatabasePool(id, config), writable: false, configurable: false, enumerable: false}), id);
}

function update(id: string, config: DatabaseEnvironmental): iDatabasePool {
  const pool = store[id];
  if (!pool) { throw Response.error(409, "db_update", {id: id}); }
  remove(id);
  return add(id, config);
}

function remove(id: string): boolean {
  const pool = store[id];
  if (!pool) { throw Response.error(409, "db_delete", {id: id}); }
  cluster.remove(id);
  cluster.remove(id + "::*");
  return delete store[id];
}

function parse(sql: string, replacers?: any): string {
  return _.reduce(sql.match(/(?<=\s+|^|[(.])\?{1,3}(?=\s+|$|[);.])/g), (result, qmarks, index) => {
    if (_.isUndefined(replacers)) { return result; }
    const replacer = _.concat(replacers)[index];
    const regex = new RegExp("(?<=\\\s+|^|[(.])\\\?{" + qmarks.length + "}(?=\\\s+|$|[);.])");
    if (qmarks.length === 3) {
      return result.replace(regex, parseWhere(replacer));
    }
    if (qmarks.length === 2) {
      if (_.isArray(replacer)) { return result.replace(regex, "$1" + _.join(_.map(replacer, s => "`" + s + "`"), ".") + "$2"); }
      return result.replace(regex, "`" + replacer + "`");
    }
    return result.replace(regex, mysql.escape(replacer));
  }, sql);
}

function parseWhere(rps: any[]) {
  if (_.isArray(rps)) { return `(${_.join(_.map(rps, replacer => parseWhere(replacer)), ") OR (")})`; }
  if (_.isPlainObject(rps)) {
    return `(${_.join(_.map(rps, (o, k) => !_.isArray(o) && _.isPlainObject(o) ? mysql.format(`?? IN (${_.join(_.map(o, r => mysql.format("?", r)), ", ")})`, [k]) : mysql.format("?? = ?", [k, o])), ") AND (")})`;
  }
  return mysql.format("?? IS NULL", rps);
}

class DatabasePool implements iDatabasePool {
  
  public id: string;
  private readonly __pool: mysql.Pool;
  private readonly __slaves: {[key: string]: {__pool: mysql.Pool, __configuration: iDatabaseConfig}};
  private readonly __configuration: iDatabaseConfig;
  
  constructor(id: string, config: DatabaseMasterEnvironmental) {
    this.id = id;
    this.__configuration = DatabasePool.generateConfig(config);
    this.__slaves = {};
    this.__pool = mysql.createPool(this.__configuration);
    _.each(config.slaves, (slave: DatabaseEnvironmental) => this.add(slave));
    store[id] = this;
    cluster.add(id, this.__configuration);
    database_pipe.add(ePromisePipeStagesInitDatabase.REGISTER, () =>
      new Promise((resolve, reject) => {
        const connector = mysql.createConnection(_.omit(this.__configuration, "database"));
        connector.query("CREATE DATABASE IF NOT EXISTS `" + this.__configuration.database + "`", err => err ? reject(err) : connector.end(err => err ? reject(err) : resolve(this)));
      })
    );
  }
  
  public query<T>(sql: string, replacers?: any | any[], options?: iDatabaseQueryConfig): Promise<T[]>
  public query<T>(sql: string, replacers?: any | any[], options?: iDatabaseQueryConfig): Promise<T[][]>
  public query<T>(sql: string, replacers?: any | any[], options: iDatabaseQueryConfig = {}): Promise<T[] | T[][]> {
    const query = parse(sql, replacers);
    return new Promise<T[] | T[][]>((resolve, reject) => {
      const cb = (err, res) => err ? reject(err) : resolve(res);
      if (options.slave && options.master) { return cluster.of(this.id).query(query, cb); }
      if (options.slave) { return cluster.of(_.isString(options.slave) ? options.slave : (this.id + "::*")).query(query, cb); }
      return cluster.of(this.id).query(query, cb);
    })
    .catch(err => Promise.reject(Response.error(err.code || 500, err.type || "query", err)))
    .then(res => !_.isEmpty(res) && _.every(res, r => !_.isArray(r) || !_.isEmpty(r)) ? Promise.resolve(res) : Promise.reject(Response.error(404, "query", {query: query})));
  }
  
  public queryOne<T>(sql: string, replacers?: any | any[], options: iDatabaseQueryConfig = {}): Promise<T> {
    const query = parse(sql, replacers);
    return new Promise((resolve, reject) => {
      const cb = (err, res) => err ? reject(err) : resolve(res);
      if (options.slave && options.master) { return cluster.of(this.id).query(query, cb); }
      if (options.slave) { return cluster.of(_.isString(options.slave) ? options.slave : (this.id + "::*")).query(query, cb); }
      return cluster.of(this.id).query(query, cb);
    })
    .then(res => res[0] ? Promise.resolve(res[0]) : Promise.reject(Response.error(404, "query", {query: query})));
  }
  
  private add(config: DatabaseEnvironmental) {
    const key = config.socket_path || _.join([config.host, config.user, config.database], "::");
    const slave = this.__slaves[key];
    if (slave) { throw Response.error(500, "db_add", config); }
    this.__slaves[key] = {__configuration: DatabasePool.generateConfig(config), __pool: mysql.createPool(config)};
    cluster.add(_.join([this.id, key], "::"), this.__slaves[key].__configuration);
  }
  
  private static generateConfig(config: DatabaseEnvironmental): iDatabaseConfig {
    return _.assign(
      {
        database:           "master",
        host:               "localhost",
        port:               3306,
        charset:            "utf8mb4_unicode_ci",
        timezone:           "local",
        connectTimeout:     10000,
        stringifyObjects:   false,
        multipleStatements: true
      },
      <iDatabaseConfig>_.mapKeys(config, (v, k) => _.camelCase(k))
    );
  }
  
}

const exported: iDatabaseService = _.assign(
  Service,
  {
    get store() { return store; },
    get cluster() { return cluster; },
    add:    add,
    update: update,
    remove: remove,
    parse:  parse
  }
);

export = exported;
