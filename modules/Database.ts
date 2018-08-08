import Promise from "aigle";
import * as _ from "lodash";
import * as mysql from "mysql";

const __cluster = mysql.createPoolCluster();
const __pools: {[namespace: string]: Pool} = {};
const __configurations: {[id: string]: any} = {};

export function register(key: string, options: DatabaseOptions | DatabaseOptions[]): Promise<Pool> {
  const namespace = new Pool(key);
  return new Promise((resolve, reject) =>
    Promise.map(Array.isArray(options) ? options : [options], o =>
      Promise.map(Array.isArray(o.database) ? o.database : [o.database], database =>
        namespace.add(_.assign({
          database:           database,
          host:               "localhost",
          port:               3306,
          charset:            "utf8mb4_unicode_ci",
          timezone:           "local",
          connectTimeout:     10000,
          stringifyObjects:   false,
          multipleStatements: true
        }, _.mapKeys(options, (v, k) => _.camelCase(k))))
      )
    )
    .then(() => resolve(namespace))
    .catch(err => reject(err))
  );
}

export function namespace(id: string): Pool { return _.clone(__pools[id]); }

export function namespaces() { return _.clone(__pools); }

export function configuration(id: string) { return _.clone(__configurations[id]); }

export function configurations() { return _.clone(__configurations); }

export function parse(sql: string, replacers: any | any[]) {
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

export class Pool implements Pool {
  
  public readonly id: string;
  private readonly __databases: {[key: string]: mysql.Pool} = {};
  
  constructor(id: string) {
    this.id = id;
    return __pools[id] || (__pools[id] = this);
  }
  
  public get databases(): {[key: string]: mysql.Pool} {
    return _.clone(this.__databases);
  }
  
  public add(config: mysql.PoolConfig): Promise<this> {
    const id = `${this.id}::${config.socketPath || config.host}::${config.database}`;
    const path = config.socketPath || `mysql://${config.user}:${encodeURIComponent(config.password)}@${config.host}/`;
    if (this.__databases[id]) { return Promise.resolve(this); }
    return new Promise((resolve, reject) => mysql.createConnection(path).query("CREATE DATABASE IF NOT EXISTS `" + config.database + "`", err => err ? reject(err) : resolve()))
    .then(() => {
      __cluster.add(id, __configurations[id] = config);
      this.__databases[id] = __cluster.of(id);
      return this;
    });
  }
  
  public remove(id: string): this {
    __cluster.remove(id);
    delete __pools[id];
    delete __configurations[id];
    delete this.__databases[id];
    return this;
  }
  
  public all<T>(expression: string, replacers?: any[]): Promise<T[]> {
    return Promise.map<{[key: string]: mysql.Pool}, T>(this.__databases, database => new Promise((resolve, reject) => {
      database.query(parse(expression, replacers), (err, result) => err ? reject(err) : resolve(result));
    }));
  }
  
  public query<T>(expression: string, replacers?: any): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) =>
      __cluster.of(`${this.id}::*`).query(parse(expression, replacers), (err, res) =>
        err ? reject(err) : resolve(res)
      )
    );
  }
  
  public connect(): Promise<DatabaseConnection> {
    return new Promise((resolve, reject) => {
      __cluster.of(`${this.id}::`).getConnection((err, connection) => {
        err ? reject(err) : resolve(new DatabaseConnection(connection));
      });
    });
  }
  
}

export interface IDatabaseConnection {
  query: (expression: string, replacers?: any) => Promise<any>
  close: () => Promise<void>
  transaction: (options: mysql.QueryOptions) => Promise<void>
  commit: (options: mysql.QueryOptions) => Promise<void>
}

class DatabaseConnection implements IDatabaseConnection {
  
  private __connection: mysql.Connection;
  
  constructor(connection: mysql.Connection) {
    this.__connection = connection;
  }
  
  public query<T>(expression: string, replacers?: any): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) =>
      this.__connection.query(parse(expression, replacers), (err, res) =>
        err ? reject(err) : resolve(res)
      )
    );
  }
  
  public transaction(options?: mysql.QueryOptions): Promise<void> {
    return new Promise((resolve, reject) =>
      this.__connection.beginTransaction(options, err => err ? reject(err) : resolve())
    );
  }
  
  public commit(options?: mysql.QueryOptions): Promise<void> {
    return new Promise((resolve, reject) =>
      this.__connection.commit(options, err => err ? reject(err) : resolve())
    );
  }
  
  public close(): Promise<void> {
    return new Promise((resolve, reject) =>
      this.__connection.end(err => err ? reject(err) : resolve())
    );
  }
}

interface DatabaseOptions {
  user: string
  password: string
  database: string | string[]
  host?: "localhost" | string
  port?: 3306 | number
  socketPath?: string
  socket_path?: string
  localAddress?: string
  local_address?: string
  charset?: "utf8mb4_unicode_ci" | string
  timezone?: "local" | string
  connectTimeout?: 10000 | number
  connect_timeout?: 10000 | number
  stringifyObjects?: false | boolean
  stringify_objects?: false | boolean
  insecureAuth?: false | boolean
  insecure_auth?: false | boolean
  typeCast?: true
  type_cast?: true
  supportBigNumbers?: false | boolean
  support_big_numbers?: false | boolean
  bigNumberStrings?: false | boolean
  big_number_strings?: false | boolean
  debug?: false | boolean | string[]
  trace?: true | boolean
  flags?: string | string[]
  ssl?: any
}
