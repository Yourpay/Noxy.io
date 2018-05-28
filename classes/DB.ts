import * as Promise from "bluebird";
import * as _ from "lodash";
import * as mysql from "mysql";
import DBConnection from "./DBConnection";

export default class DB {
  
  private pool: mysql.Pool;
  
  constructor(options: iDBConnectionOptions) {
    this.pool = DB.createPool(_.omit(options, "database"))
  }
  
  public connect(): Promise<DBConnection> {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => err ? reject(err) : resolve(new DBConnection(this, connection)));
    });
  }
  
  public setDatabase(options): Promise<DB>
  public setDatabase(options, connection): Promise<DBConnection>
  public setDatabase(options, connection?): Promise<DB | DBConnection> {
    return new Promise((resolve, reject) => {
      this.pool.end(err => {
        if (err) { return reject(err); }
        const db = _.set(this, "pool", DB.createPool(options));
        if (!connection) { return resolve(db); }
        db.connect().then(res => resolve(res)).catch(err => reject(err));
      });
    });
  }
  
  private static createPool(options): mysql.Pool {
    return mysql.createPool(_.merge(options, {pool: +options.pool || 100, multipleStatements: true}));
  }
  
}

export interface iDBConnectionOptions {
  user: string
  password: string
  host: string
  database: string
  pool?: number
}
