import * as Promise from "bluebird";
import * as _ from "lodash";
import * as mysql from "mysql";
import * as Response from "./Response";

const Database: iDatabase = Default;

function Default(id: string): DatabasePool
function Default(id: string, config: DatabaseMasterEnvironmental): DatabasePool
function Default(id: string, config?: DatabaseMasterEnvironmental): DatabasePool {
  const pool = Database.pools[id];
  if (config) { return pool ? Database.update(id, config) : Database.add(id, config); }
  if (pool) { return pool; }
  throw new Response.error(404, "pool", id);
}

Object.defineProperty(Database, "cluster", {value: mysql.createPoolCluster(), writable: false, configurable: false, enumerable: false});
Object.defineProperty(Database, "pools", {value: {}, writable: false, configurable: false, enumerable: true});

function databaseAdd(id: string, config: DatabaseEnvironmental): DatabasePool {
  const pool = Database.pools[id];
  if (pool) { throw new Response.error(409, "db_add", id); }
  
  return _.get(Object.defineProperty(Database, id, {value: new DatabasePool(id, config), writable: false, configurable: false, enumerable: false}), id);
}

Database.add = databaseAdd;

function databaseUpdate(id: string, config: DatabaseEnvironmental): DatabasePool {
  const pool = Database.pools[id];
  if (!pool) { throw new Response.error(409, "db_update", id); }
  Database.remove(id);
  return Database.add(id, config);
}

Database.update = databaseUpdate;

function databaseRemove(id: string) {
  const pool = Database.pools[id];
  if (!pool) { throw new Response.error(409, "db_delete", id); }
  Database.cluster.remove(id);
  Database.cluster.remove(id + "::*");
  return delete Database.pools[id];
}

Database.remove = databaseRemove;

function databaseParse(sql: string, replacers: any | any[]) {
  return _.reduce(sql.match(/(\s+|^|\()\?{1,3}(\s+|$|\))/g), (result, match, i) => {
    if (!replacers) { return result; }
    const r = _.concat(replacers)[i];
    const length = (match.match(/\?/g) || []).length;
    const regex = new RegExp("(\\\s+|^|\\\()\\\?{" + length + "}(\\\s+|$|\\\))");
    if (length === 3) {
      if (r.type === "in" && r.key && r.values) { return result.replace(regex, "$1`" + r.key + "` IN (" + mysql.escape(r.values) + ")$2"); }
      return result.replace(regex, "$1" + mysql.escape(r) + "$2");
    }
    if (length === 2) {
      if (_.isArray(r)) { return result.replace(regex, "$1" + _.join(_.map(r, s => "`" + s + "`"), ".") + "$2"); }
      return result.replace(regex, "$1`" + r + "`$2");
    }
    return result.replace(regex, "$1" + mysql.escape(r) + "$2");
  }, sql);
}

Database.parse = databaseParse;

export = Database;

class DatabasePool {
  
  public id: string;
  private __pool: mysql.Pool;
  private __configuration: iDatabaseConfig;
  private __slaves: {[key: string]: {__pool: mysql.Pool, __configuration: iDatabaseConfig}};
  
  constructor(id: string, config: DatabaseMasterEnvironmental) {
    this.id = id;
    this.__configuration = DatabasePool.generateConfig(config);
    this.__slaves = {};
    this.__pool = mysql.createPool(this.__configuration);
    _.each(config.slaves, slave => this.add(slave));
    Database.pools[id] = this;
    Database.cluster.add(id, this.__configuration);
    
  }
  
  public query<T>(sql: string, replacers?: any | any[], options: iDatabaseQueryConfig = {}): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const cb = (err, res) => err ? reject(err) : resolve(res);
      const query = Database.parse(sql, replacers);
      if (options.slave && options.master) { return Database.cluster.of(this.id).query(query, cb); }
      if (options.slave) { return Database.cluster.of(_.isString(options.slave) ? options.slave : (this.id + "::*")).query(query, cb); }
      return Database.cluster.of(this.id).query(query, cb);
    });
  }
  
  private add(config: DatabaseEnvironmental) {
    const key = config.socket_path || _.join([config.host, config.user, config.database], "::");
    const slave = this.__slaves[key];
    if (slave) { throw new Response.error(500, "db_add", config); }
    this.__slaves[key] = {__configuration: DatabasePool.generateConfig(config), __pool: mysql.createPool(config)};
    Database.cluster.add(_.join([this.id, key], "::"), this.__slaves[key].__configuration);
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

interface iDatabase extends Object {
  cluster?: mysql.PoolCluster
  pools?: {[key: string]: DatabasePool}
  
  add?: (id: string, config: DatabaseEnvironmental) => DatabasePool
  update?: (id: string, config: DatabaseEnvironmental) => DatabasePool
  remove?: (id: string) => boolean
  parse?: (sql: string, replacers: any | any[]) => string
  
  (pool: string): DatabasePool
  
  (pool: string, options: DatabaseMasterEnvironmental): DatabasePool
}

interface iDatabaseConfig {
  user: string
  password: string
  database: string
  host?: "localhost" | string
  port?: 3306 | number
  socketPath?: string
  localAddress?: string
  charset?: "utf8mb4_unicode_ci" | string
  timezone?: "local" | string
  connectTimeout?: 10000 | number
  stringifyObjects?: false | boolean
  insecureAuth?: false | boolean
  typeCast?: true
  supportBigNumbers?: false | boolean
  bigNumberStrings?: false | boolean
  debug?: false | boolean | string[]
  trace?: true | boolean
  flags?: string[]
  ssl?: any
}

interface iDatabaseQueryConfig {
  slave?: boolean | string
  master?: boolean
}
