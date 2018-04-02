import * as Promise from "bluebird";
import * as _ from "lodash";
import * as mysql from "mysql";
import DBConnection from "./DBConnection";

export default class DBPool {
  
  private pool: mysql.Pool;
  private options: iDBConnectionOptions;
  public links: { [key: string]: DBConnection };
  
  public static pools: { [key: string]: DBPool } = {};
  
  constructor(options: iDBConnectionOptions) {
    this.options = _.merge(options, {pool: typeof options.pool === "number" ? options.pool : 100, multipleStatements: true});
    this.pool = mysql.createPool(options);
    this.links = {};
    return DBPool.pools[`${options.host}:${options.database}`] = this;
  }
  
  public link(): Promise<DBConnection> {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => err ? reject(err) : resolve(new DBConnection(this, connection)));
    });
  }
  
}

export interface iDBConnectionOptions {
  username: string
  password: string
  host: string
  database: string
  pool?: number
}
