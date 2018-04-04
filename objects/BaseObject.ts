import * as _ from "lodash";
import * as uuid from "uuid";
import {users} from "../app";

export interface iObjectField {
  type?: any;
  required?: boolean
  protected?: boolean
  intermediate?: boolean
  onInsert?: (object: BaseObject, value?: any) => any;
  onUpdate?: (object: BaseObject, value?: any) => any;
  onDelete?: (object: BaseObject, value?: any) => any;
}

export default abstract class BaseObject {
  
  [key: string]: any
  
  public id: Buffer;
  public uuid: string;
  
  protected __type: string;
  protected __validated: boolean;
  protected __fields: { [key: string]: iObjectField } = {
    id: {type: "binary(16)", protected: true, required: true, onInsert: (t, v) => _.set(t, "id", BaseObject.isUuid(v) ? BaseObject.uuidToBuffer(this.uuid = v) : BaseObject.uuidToBuffer(this.uuid = uuid.v4()))},
    uuid: {intermediate: true}
  };
  
  protected constructor(type: string) {
    this.__type = type;
    this.__validated = false;
  }
  
  public toObject() {
    return _.omitBy(this, (v, k) => k.slice(0, 2) === "__");
  }
  
  protected addTimeFields(): this {
    this.__fields.time_created = {type: "bigint(14)", protected: true, onInsert: o => o.time_created = Date.now()};
    this.__fields.time_updated = {type: "bigint(14)", protected: true, onUpdate: o => o.time_updated = Date.now()};
    this.__fields.time_deleted = {type: "bigint(14)", protected: true, onDelete: o => o.time_deleted = Date.now()};
    return this;
  }
  
  protected addUserFields(): this {
    this.__fields.user_created = {type: "binary(16)", protected: true, onInsert: (o, v) => o.user_created = v || users["server"]};
    this.__fields.user_updated = {type: "binary(16)", protected: true, onUpdate: (o, v) => o.user_updated = v || users["server"]};
    this.__fields.user_deleted = {type: "binary(16)", protected: true, onDelete: (o, v) => o.user_deleted = v || users["server"]};
    return this;
  }
  
  protected init(object: string | { [key: string]: any }): this {
    if (typeof object === "string") { return this.__fields.id.onInsert(this, object); }
    _.each(this.__fields, (value, key) => !value.protected && object[key] && (this[key] = value.onInsert ? value.onInsert(this, object[key]) : object[key]) || true);
    if (object.id instanceof Buffer && !object.uuid && BaseObject.isUuid(BaseObject.bufferToUuid(object.id))) { return _.set(this, "uuid", BaseObject.bufferToUuid(this.id = object.id)); }
    return this.__fields.id.onInsert(this, object.uuid);
  }
  
  protected static isUuid(uuid: string): boolean {
    return !!`${uuid}`.match(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  }
  
  protected static uuidToBuffer(uuid: string): Buffer {
    return new Buffer(uuid.replace(/-/g, ""), "hex");
  }
  
  protected static bufferToUuid(buffer: Buffer): string {
    const hex = buffer.toString("hex");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16);
  }
  
  // public toObject(): any {
  //   return _.merge(_.omitBy(this.__filter(), (v, k) => this.__protected[k] && this.__required[k]), {uuid: this.uuid});
  // }
  //
  // public validate(): Promise<this> {
  //   return this.__retrieve().then(() => _.set(this, "__validated", true));
  // }
  //
  // public save(user?: any): Promise<this> {
  //   return new Promise((resolve, reject) => {
  //     const promises = [];
  //     if (!this.__validated) { promises.push(this.validate().catch(err => err.code === "400.db.select" ? this : reject(err))); }
  //     Promise.all(promises).then(() => {
  //       this.__store(user).then(res => resolve(res), err => reject(err));
  //     });
  //   });
  // }
  //
  // protected __filter() {
  //   return _.transform(this, (result: object, value: any, key: string) => {
  //
  //     if (_.includes(["function", "object"], typeof value) && !(value instanceof Buffer)) { return result; }
  //     if (this.__protected[key] && !this.__required[key]) { return result; }
  //     if (key.slice(0, 2) === "__" || key === "uuid") { return result; }
  //
  //     return _.set(result, key, value);
  //   }, {});
  // }
  //
  // protected __fields() {
  //   return _.transform(this, (result: string[], value: any, key: string) => {
  //
  //     if (_.includes(["function", "object"], typeof value) && !(<any>value instanceof Buffer)) { return result; }
  //     if (this.__protected[key] && !this.__required[key]) { return result; }
  //     if ((<string>key).slice(0, 2) === "__" || key === "uuid") { return result; }
  //
  //     return _.concat(result, key);
  //   }, _.keys(this.__required));
  // }
  //
  // protected __retrieve(): Promise<this> {
  //   return new Promise<this>((resolve, reject) =>
  //     db[env.mode].link()
  //     .then(link => {
  //       new Promise<this>((resolve, reject) => {
  //         const query = link.parse("SELECT ?? FROM ?? WHERE `id` = ?", [this.__fields(), this.__type, this.id]);
  //         link.query(query)
  //         .then(res => res[0] ? resolve(_.assign(this, res[0])) : reject(new ServerError("400.db.select", query)))
  //         .catch(err => reject(new ServerError("500.db.select", err)));
  //       })
  //       .then(res => resolve(res))
  //       .catch(err => reject(err))
  //       .finally(() => link.close());
  //     })
  //     .catch(err => reject(err))
  //   );
  // }
  //
  // protected __store(user?: any): Promise<this> {
  //   return new Promise<this>((resolve, reject) =>
  //     db[env.mode].link()
  //     .then(link => {
  //       new Promise<this>((resolve, reject) => {
  //         if (this.__validated) {
  //           const object = _.assign(this.__filter(), {time_updated: Date.now()});
  //           if (user) { object.user_updated = user instanceof Buffer ? user : user.id; }
  //           const query = link.parse("UPDATE ?? SET ? WHERE `id` = ?", [this.__type, object, this.id]);
  //           return link.query(query)
  //           .then(() => resolve(_.assign(this, object)))
  //           .catch(err => reject(new ServerError("500.db.update", err)));
  //         }
  //         const object = _.merge(this.__filter(), {time_created: Date.now()});
  //         if (user) { object.user_created = user instanceof Buffer ? user : user.id; }
  //         const query = link.parse("INSERT INTO ?? SET ?; SELECT ?? FROM ?? WHERE `id` = ?", [this.__type, object, this.__fields(), this.__type, this.id]);
  //         link.query(query)
  //         .then(res => resolve(_.assign(this, res[1][0], {__validated: true})))
  //         .catch(err => reject(new ServerError("500.db.insert", err)));
  //       })
  //       .then(res => resolve(res), err => reject(err))
  //       .finally(() => link.close());
  //     })
  //     .catch(err => reject(err))
  //   );
  // }
  //
  // private static hex(binary: Buffer): string {
  //   const hex = binary.toString("hex");
  //   return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16);
  // }
  
}
