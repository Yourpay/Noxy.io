import * as _ from "lodash";
import * as uuid from "uuid";
import {db, users} from "../app";
import * as Promise from "bluebird";
import * as env from "../env.json";
import ServerError from "./ServerError";
import User from "../objects/User";

export default abstract class BaseObject {
  
  [key: string]: any
  
  public id: Buffer;
  public uuid: string;
  protected __validated: boolean = false;
  protected __type: string;
  protected __fields: { [key: string]: iObjectField };
  protected __indexes: iObjectIndex;
  protected __primary: string[];
  
  public static __type: string;
  public static __fields: { [key: string]: iObjectField } = {
    id: {type: "binary(16)", protected: true, required: true, onCreate: (t, v) => BaseObject.isUuid(v) ? BaseObject.uuidToBuffer(t.uuid = v) : BaseObject.uuidToBuffer(t.uuid = uuid.v4())},
    uuid: {intermediate: true}
  };
  public static __indexes: iObjectIndex = {};
  public static __primary: string[] = ["id"];
  public static __constraints: iObjectConstraint = {};
  
  public toObject() {
    return _.omitBy(this, (v: any, k) => k.slice(0, 2) === "__" || v instanceof Buffer);
  }
  
  public get validated() {
    return this.__validated;
  }
  
  public validate() {
    return new Promise<this>((resolve, reject) => {
      db[env.mode].connect()
      .then(link => {
        const indexes = _.concat(_.values(this.__indexes.unique), [this.__primary]);
        const where = _.join(_.map(indexes, a => `(${_.join(_.map(a, k => `\`${k}\` = ?`), " AND ")})`), " OR ");
        const values = _.reduce(indexes, (r, a) => _.concat(r, _.map(a, v => this[v] || "")), []);
        const sql = link.parse(`SELECT * FROM ?? WHERE ${where}`, _.concat(this.__type, values));
        link.query(sql)
        .then(res => res[0] ? resolve(_.assign(this, res[0], {__validated: true, uuid: BaseObject.bufferToUuid(res[0].id)})) : reject(new ServerError("404.db.select", sql)))
        .catch(err => reject(ServerError.parseSQLError(err)))
        .finally(() => link.close());
      })
      .catch(err => reject(err));
    });
  }
  
  public save(invoker?: User) {
    return new Promise<this>((resolve, reject) => {
      new Promise((resolve, reject) => this.__validated ? resolve(this) : this.validate().then(res => resolve(res)).catch(err => reject(err)))
      .catch(err => err.code === "404.db.select" ? this : reject(err))
      .then(() => {
        const on = !this.__validated ? "onInsert" : "onUpdate";
        _.each(this.__fields, (field, key) => field[on] && (this[key] = _.invoke(field, on, this, invoker)));
        if (!this.__validated && !_.every(this.__fields, (v, k) => !v.required || v.required && this[k])) { return reject(new ServerError("400.db.insert", this)); }
        db[env.mode].connect()
        .then(link => {
          const values = [this.__type, this.filter(), this.id];
          const sql = link.parse(!this.__validated ? "INSERT IGNORE INTO ?? SET ?" : "UPDATE ?? SET ? WHERE `id` = ?", values);
          link.query(sql)
          .then(res => res.affectedRows > 0 ? resolve(_.assign(this, {__validated: true})) : reject(new ServerError(`400.db.${!this.__validated ? "insert" : "update"}`, sql)))
          .catch(err => reject(ServerError.parseSQLError(err)))
          .finally(() => link.close());
        })
        .catch(err => reject(err));
      });
    });
  }
  
  protected init(object: string | { [key: string]: any }): this {
    const base = (<typeof BaseObject>this.constructor);
    this.__type = base.__type;
    this.__fields = base.__fields;
    this.__indexes = base.__indexes;
    this.__primary = base.__primary;
    if (typeof object === "string") { return this.__fields.id.onCreate(this, object); }
    _.each(this.__fields, (value, key) => (!value.protected || value.onCreate) && (object[key] || key === "id") && (this[key] = value.onCreate ? value.onCreate(this, object[key]) : object[key]) || true);
    _.each(this, (value, key) => this[key] === null ? delete this[key] : true);
    if (object.id instanceof Buffer && !object.uuid && BaseObject.isUuid(BaseObject.bufferToUuid(object.id))) { return _.set(this, "uuid", BaseObject.bufferToUuid(this.id = object.id)); }
    return this;
  }
  
  protected filter(): Partial<this> {
    return _.omitBy(this, (v, k) => k.slice(0, 2) === "__" || k === "uuid");
  }
  
  protected static isUuid(uuid: string): boolean {
    return !!`${uuid}`.match(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  }
  
  protected static uuidToBuffer(uuid: string): Buffer {
    return new Buffer(uuid.replace(/-/g, ""), "hex");
  }
  
  protected static bufferToUuid(buffer: Buffer): string {
    const hex = buffer.toString("hex");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }
  
  protected static generateTimeFields(): { [key: string]: iObjectField } {
    return {
      time_created: {type: "bigint(14)", protected: true, onInsert: o => o.time_created = Date.now()},
      time_updated: {type: "bigint(14)", protected: true, onUpdate: o => o.time_updated = Date.now()},
      time_deleted: {type: "bigint(14)", protected: true, onDelete: o => o.time_deleted = Date.now()}
    };
  }
  
  protected static generateTimeIndexes(): iObjectIndex {
    return {
      key: {
        time_created: ["time_created"],
        time_updated: ["time_updated"],
        time_deleted: ["time_deleted"]
      }
    };
  }
  
  protected static generateUserFields(): { [key: string]: iObjectField } {
    return {
      user_created: {type: "binary(16)", protected: true, onInsert: (o, v) => _.get(v, "id", _.get(users, "server.id", null))},
      user_updated: {type: "binary(16)", protected: true, onUpdate: (o, v) => _.get(v, "id", _.get(users, "server.id", null))},
      user_deleted: {type: "binary(16)", protected: true, onDelete: (o, v) => _.get(v, "id", _.get(users, "server.id", null))}
    };
  }
  
  protected static generateUserIndexes(): iObjectIndex {
    return {
      key: {
        user_created: ["user_created"],
        user_updated: ["user_updated"],
        user_deleted: ["user_deleted"]
      }
    };
  }
  
  protected static generateUserConstraints(): iObjectConstraint {
    return {
      foreign_key: [
        {table: require("./../objects/User").default.__type, column: "user_created", on_delete: "NO ACTION", on_update: "CASCADE"},
        {table: require("./../objects/User").default.__type, column: "user_updated", on_delete: "NO ACTION", on_update: "CASCADE"},
        {table: require("./../objects/User").default.__type, column: "user_deleted", on_delete: "NO ACTION", on_update: "CASCADE"}
      ]
    };
  }
  
}

export interface iObjectConstraint {
  [key: string]: any
  
  foreign_key?: iObjectForeignKeyConstraint[]
}

export interface iObjectForeignKeyConstraint {
  table: string
  column: string
  on_delete: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
  on_update: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
}

export interface iObjectIndex {
  [key: string]: { [key: string]: string[] }
  
  key?: { [key: string]: string[] }
  unique?: { [key: string]: string[] }
  fulltext?: { [key: string]: string[] }
  spatial?: { [key: string]: string[] }
}

export interface iObjectField {
  [key: string]: any
  
  type?: any;
  required?: boolean
  protected?: boolean
  intermediate?: boolean
  onCreate?: (object: BaseObject, value?: any) => any;
  onInsert?: (object: BaseObject, invoker?: User) => any;
  onUpdate?: (object: BaseObject, invoker?: User) => any;
  onDelete?: (object: BaseObject, invoker?: User) => any;
}
