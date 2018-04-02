import * as _ from "lodash";
import * as uuid from "uuid";
import * as Promise from "bluebird";
import {db} from "../app";
import ServerError from "../classes/ServerError";
import * as env from "../env.json";

export default abstract class BaseObject {
  
  [key: string]: any
  
  public id: Buffer;
  public uuid: string;
  
  public user_created?: Buffer;
  public user_updated?: Buffer;
  public user_deleted?: Buffer;
  
  public time_created?: number;
  public time_updated?: number;
  public time_deleted?: number;
  
  protected __type: string = "";
  protected __validated: boolean = false;
  protected __required: { [key: string]: boolean } = {};
  protected __protected: { [key: string]: boolean } = {};
  
  protected constructor(type: string, object: any) {
    _.merge(this, object);
    
    if (!this.id) { this.id = new Buffer((this.uuid || (this.uuid = uuid.v4())).replace(/-/g, ""), "hex"); }
    
    this.__type = type;
    this.__protected.id = this.__required.id = true;
    this.__protected.time_created = this.__required.time_created = true;
    this.__protected.time_updated = this.__required.time_updated = true;
    this.__protected.time_deleted = this.__required.time_deleted = true;
  }
  
  public toObject(): any {
    return _.merge(_.omitBy(this.__filter(), (v, k) => this.__protected[k] && this.__required[k]), {uuid: this.uuid});
  }
  
  public validate(): Promise<this> {
    return this.__retrieve().then(() => _.set(this, "__validated", true));
  }
  
  public save(user?: any): Promise<this> {
    return new Promise((resolve, reject) => {
      const promises = [];
      if (!this.__validated) { promises.push(this.validate().catch(err => err.code === "400.db.select" ? this : reject(err))); }
      Promise.all(promises).then(() => {
        this.__store(user).then(res => resolve(res), err => reject(err));
      });
    });
  }
  
  protected __filter() {
    return _.transform(this, (result: object, value: any, key: string) => {
      
      if (_.includes(["function", "object"], typeof value) && !(value instanceof Buffer)) { return result; }
      if (this.__protected[key] && !this.__required[key]) { return result; }
      if (key.slice(0, 2) === "__" || key === "uuid") { return result; }
      
      return _.set(result, key, value);
    }, {});
  }
  
  protected __fields() {
    return _.transform(this, (result: string[], value: any, key: string) => {
      
      if (_.includes(["function", "object"], typeof value) && !(<any>value instanceof Buffer)) { return result; }
      if (this.__protected[key] && !this.__required[key]) { return result; }
      if ((<string>key).slice(0, 2) === "__" || key === "uuid") { return result; }
      
      return _.concat(result, key);
    }, _.keys(this.__required));
  }
  
  protected __retrieve(): Promise<this> {
    return new Promise<this>((resolve, reject) =>
      db[env.mode].link()
      .then(link => {
        new Promise<this>((resolve, reject) => {
          const query = link.parse("SELECT ?? FROM ?? WHERE `id` = ?", [this.__fields(), this.__type, this.id]);
          link.query(query)
          .then(res => res[0] ? resolve(_.assign(this, res[0])) : reject(new ServerError("400.db.select", query)))
          .catch(err => reject(new ServerError("500.db.select", err)));
        })
        .then(res => resolve(res))
        .catch(err => reject(err))
        .finally(() => link.close());
      })
      .catch(err => reject(err))
    );
  }
  
  protected __store(user?: any): Promise<this> {
    return new Promise<this>((resolve, reject) =>
      db[env.mode].link()
      .then(link => {
        new Promise<this>((resolve, reject) => {
          if (this.__validated) {
            const object = _.assign(this.__filter(), {time_updated: Date.now()});
            if (user) { object.user_updated = user instanceof Buffer ? user : user.id; }
            const query = link.parse("UPDATE ?? SET ? WHERE `id` = ?", [this.__type, object, this.id]);
            return link.query(query)
            .then(() => resolve(_.assign(this, object)))
            .catch(err => reject(new ServerError("500.db.update", err)));
          }
          const object = _.merge(this.__filter(), {time_created: Date.now()});
          if (user) { object.user_created = user instanceof Buffer ? user : user.id; }
          const query = link.parse("INSERT INTO ?? SET ?; SELECT ?? FROM ?? WHERE `id` = ?", [this.__type, object, this.__fields(), this.__type, this.id]);
          link.query(query)
          .then(res => resolve(_.assign(this, res[1][0], {__validated: true})))
          .catch(err => reject(new ServerError("500.db.insert", err)));
        })
        .then(res => resolve(res), err => reject(err))
        .finally(() => link.close());
      })
      .catch(err => reject(err))
    );
  }
  
  private static hex(binary: Buffer): string {
    const hex = binary.toString("hex");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16);
  }
  
}
