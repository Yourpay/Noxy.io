import * as mysql from "mysql";
import * as _ from "lodash";
import Promise from "aigle";

export namespace DatabaseService {
  
  const __cluster = mysql.createPoolCluster();
  const __namespaces: {[namespace: string]: DatabaseNamespace} = {};
  const __pools: {[key: string]: DatabasePool} = {};
  
  export function register(key: string, options: DatabaseOptions | DatabaseOptions[]): DatabaseNamespace {
    const namespace = __namespaces[key] || (__namespaces[key] = new DatabaseNamespace(key));
    _.each(Array.isArray(options) ? options : [options], (o: DatabaseOptions) =>
      _.each(Array.isArray(o.database) ? o.database : [o.database], database =>
        namespace.add(_.merge(_.mapKeys(options, (v, k) => _.camelCase(k)), {
          database:           database,
          multipleStatements: true
        }))
      )
    );
    return namespace;
  }
  
  export function namespace(id: string): DatabaseNamespace {
    return __namespaces[id];
  }
  
  export function namespaces() {
    return _.clone(__namespaces);
  }
  
  export function pool(id: string): DatabasePool {
    return __pools[id];
  }
  
  export function pools() {
    return _.clone(__pools);
  }
  
  class DatabaseNamespace {
    
    public readonly id: string;
    private readonly __pools: {[key: string]: DatabasePool} = {};
    
    constructor(id: string) {
      this.id = id;
    }
    
    public get pools(): {[key: string]: DatabasePool} {
      return _.clone(this.__pools);
    }
    
    public add(config: mysql.PoolConfig): this {
      const id = `${this.id}-${config.socketPath || config.host}-${config.database}`;
      if (this.__pools[id]) { return this; }
      __cluster.add(id, config);
      __pools[id] = this.__pools[id] = new DatabasePool(id, __cluster.of(id));
      return this;
    }
    
    public remove(id: string)
    public remove(db: DatabasePool)
    public remove(id: string | DatabasePool): this {
      id = id instanceof DatabasePool ? id.id : id;
      __cluster.remove(id);
      delete __pools[id];
      delete this.__pools[id];
      return this;
    }
    
    public query(expression: string, replacers: any[]): Promise<any> {
      return new Promise((resolve, reject) =>
        __cluster.of(this.id).query(expression, replacers, (err, res) =>
          err ? reject(err) : resolve(res)
        )
      );
    }
    
    public connect(): Promise<DatabaseConnection> {
      return new Promise((resolve, reject) => {
        __cluster.of(this.id).getConnection((err, connection) => {
          err ? reject(err) : resolve(new DatabaseConnection(connection));
        });
      });
    }
    
  }
  
  class DatabasePool {
    
    public readonly id: string;
    private readonly pool: mysql.Pool;
    
    constructor(id, pool: mysql.Pool) {
      this.id = id;
      this.pool = pool;
    }
    
    public query(expression, replacers) {
      return new Promise((resolve, reject) =>
        this.pool.query(expression, replacers || [], (err, res) =>
          err ? reject(err) : resolve(res)
        )
      );
    }
    
  }
  
  class DatabaseConnection {
    
    private __connection: mysql.Connection;
    
    constructor(connection: mysql.Connection) {
      this.__connection = connection;
    }
    
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

const options = {
  "test":  [
    {
      host:     "localhost",
      user:     "user",
      password: "password",
      database: "testimonial"
    },
    {
      host:     "localhost",
      user:     "resu",
      password: "drowssap",
      database: ["testify", "testifyier"]
    }
  ],
  "debug": {
    host:     "localhost",
    user:     "user",
    password: "password",
    database: ["debuggery", "debugchery"]
  }
  
};