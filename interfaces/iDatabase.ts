import * as Promise from "bluebird";
import * as mysql from "mysql";

export interface cDatabasePool {
  new(id: string, config: DatabaseMasterEnvironmental): iDatabasePool;
}

export interface iDatabasePool extends Object {
  id: string;
  
  query<T>(sql: string, replacers?: any | any[], options?: iDatabaseQueryConfig): Promise<T>
  
  query<T>(sql: string, replacers?: any | any[], options?: iDatabaseQueryConfig): Promise<T[]>
  
  query<T>(sql: string, replacers?: any | any[], options?: iDatabaseQueryConfig): Promise<T[][]>
  
  queryOne<T>(sql: string, replacers?: any | any[], options?: iDatabaseQueryConfig): Promise<T>
}

export interface iDatabase extends Object {
  cluster?: mysql.PoolCluster
  pools?: {[key: string]: iDatabasePool}
  
  add?: (id: string, config: DatabaseEnvironmental) => iDatabasePool
  update?: (id: string, config: DatabaseEnvironmental) => iDatabasePool
  remove?: (id: string) => boolean
  parse?: (sql: string, replacers: any | any[]) => string
  
  (pool: string): iDatabasePool
  
  (pool: string, options: DatabaseMasterEnvironmental): iDatabasePool
}

export interface iDatabaseConfig {
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

export interface iDatabaseQueryConfig {
  slave?: boolean | string
  master?: boolean
}

export interface iDatabaseActionResult {
  fieldCount: number
  affectedRows: number
  insertId: number
  serverStatus: number
  warningCount: number
  message: string
  protocol41: boolean
  changedRows: number
}
