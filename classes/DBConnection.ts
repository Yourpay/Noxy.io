import * as Promise from "bluebird";
import * as mysql from "mysql";
import DBPool from "./DBPool";
import uuid = require("uuid");

export default class DBConnection {
  
  private readonly id: string;
  private connection: mysql.PoolConnection;
  private pool: DBPool;
  
  constructor(pool: DBPool, connection: mysql.PoolConnection) {
    this.id = uuid.v4();
    this.pool = pool;
    this.connection = connection;
    this.pool.links[this.id] = this;
  }
  
  public query(query: string, replacers?: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const callback = (err, result) => err ? reject(err) : resolve(result);
      replacers ? this.connection.query(query, replacers, callback) : this.connection.query(query, callback);
    });
  }
  
  public parse(query: string, replacers?: any) {
    return this.connection.format(query, replacers);
  }
  
  public close() {
    this.connection.release();
  }
  
}
