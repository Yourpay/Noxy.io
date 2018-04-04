import * as Promise from "bluebird";
import * as _ from "lodash";
import * as mysql from "mysql";
import DBConnection from "./DBConnection";

export default class DB {
  
  private pool: mysql.Pool;
  
  constructor(options: iDBConnectionOptions) {
    this.pool = mysql.createPool(_.merge(_.omit(options, "database"), {pool: +options.pool || 100, multipleStatements: true}));
  }
  
  public connect(): Promise<DBConnection> {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => err ? reject(err) : resolve(new DBConnection(this, connection)));
    });
  }
  
}

export interface iDBConnectionOptions {
  username: string
  password: string
  host: string
  pool?: number
}
