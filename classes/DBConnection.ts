import * as Promise from "bluebird";
import * as mysql from "mysql";
import DBPool from "./DB";

export default class DBConnection {
  
  private connection: mysql.PoolConnection;
  
  constructor(pool: DBPool, connection: mysql.PoolConnection) {
    this.connection = connection;
  }
  
  public query(query: string, replacers?: any): Promise<any> {
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