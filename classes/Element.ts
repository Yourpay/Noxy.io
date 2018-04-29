import * as _ from "lodash";
import * as uuid from "uuid";
import * as mysql from "mysql";
import {db, users} from "../app";
import * as Promise from "bluebird";
import * as env from "../env.json";
import ServerError from "./ServerError";
import User from "../objects/User";

export default abstract class Element {
  
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
    id:   {type: "binary(16)", protected: true, required: true, onCreate: (t, v) => Element.isUuid(v) ? Element.uuidToBuffer(t.uuid = v) : Element.uuidToBuffer(t.uuid = uuid.v4())},
    uuid: {intermediate: true}
  };
  public static __primary: string[] = ["id"];
  public static __indexes: iObjectIndex = {};
  public static __relations: iObjectRelationSet = {};
  
  public toObject() {
    return _.set(_.omitBy(this, (v: any, k) => k.slice(0, 2) === "__" || k === "uuid" || v instanceof Buffer), "id", this.uuid);
  }
  
  public get type() {
    return this.__type;
  }
  
  public get validated() {
    return this.__validated;
  }
  
  public validate() {
    return new Promise<this>((resolve, reject) => {
      db[env.mode].connect()
      .then(link => {
        const indexes = _.concat(_.values(this.__indexes.unique_key), [this.__primary]);
        const where = _.join(_.map(indexes, a => `(${_.join(_.map(a, k => `\`${k}\` = ?`), " AND ")})`), " OR ");
        const values = _.reduce(indexes, (r, a) => _.concat(r, _.map(a, v => this[v] || "")), []);
        const sql = link.parse(`SELECT * FROM ?? WHERE ${where}`, _.concat(this.__type, values));
        link.query(sql)
        .then(res => res[0] ? resolve(_.assign(this, res[0], {__validated: true, uuid: Element.bufferToUuid(res[0].id)})) : reject(new ServerError("404.db.select", sql)))
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
  
  protected init(object: string | { [key: string]: any } = {}): this {
    const base = (<typeof Element>this.constructor);
    this.__type = base.__type;
    this.__fields = base.__fields;
    this.__indexes = base.__indexes;
    this.__primary = base.__primary;
    if (typeof object === "string") { return this.__fields.id.onCreate(this, object); }
    _.each(this.__fields, (value, key) => (!value.protected || value.onCreate) && (object[key] || key === "id") && (this[key] = value.onCreate ? value.onCreate(this, object[key]) : object[key]) || true);
    _.each(this, (value, key) => this[key] === null ? delete this[key] : true);
    if (object.id instanceof Buffer && !object.uuid && Element.isUuid(Element.bufferToUuid(object.id))) { return _.set(this, "uuid", Element.bufferToUuid(this.id = object.id)); }
    return this;
  }
  
  protected filter(): Partial<this> {
    return _.omitBy(this, (v, k) => k.slice(0, 2) === "__" || k === "uuid" || this.__fields[k]["intermediate"]);
  }
  
  protected static stringToKey(string: string): string {
    return _.deburr(string).toLowerCase().replace(/\s|\W/g, "");
  }
  
  protected static isUuid(uuid: string): boolean {
    return !!`${uuid}`.match(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  }
  
  protected static uuidToBuffer(uuid: string): Buffer {
    return Buffer.alloc(16, uuid.replace(/-/g, ""), "hex");
  }
  
  protected static bufferToUuid(buffer: Buffer): string {
    const hex = buffer.toString("hex");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }
  
  public static generateTableSQL(): string {
    return `CREATE TABLE IF NOT EXISTS ${mysql.escapeId(this.__type)} (${this.generateFieldSQL()}) ENGINE=InnoDB DEFAULT CHARSET=utf8`;
  }
  
  private static generateFieldSQL(): string {
    return _.trimEnd(_.join([this.generateColumnSQL(), this.generatePrimaryIndexSQL(), this.generateIndexSQL(), this.generateRelationSQL()]), ",");
  }
  
  private static generateColumnSQL(): string {
    return _.join(_.reduce(this.__fields, (r, v, k) => {
      if (!v.intermediate) {
        const default_value = v.default ? `DEFAULT ${mysql.escape(v.default)}` : v.default === null ? "DEFAULT NULL" : "";
        const null_value = !v.null && v.default !== null ? "NOT NULL" : "";
        r.push(mysql.format(`?? ${v.type} ${default_value} ${null_value}`, [k]));
      }
      return r;
    }, []));
  }
  
  private static generatePrimaryIndexSQL(): string {
    return `PRIMARY KEY (${_.join(_.map(this.__primary, v => mysql.escapeId(v)))})`;
  }
  
  private static generateIndexSQL(): string {
    return _.join(_.map(this.__indexes, (set, type) => _.join(_.map(set, (index, key) => `${_.upperCase(type)} ${mysql.escapeId(key)} (${_.join(_.map(index, v => mysql.escapeId(v)))})`))));
  }
  
  private static generateRelationSQL(): string {
    return _.join(_.map(this.__relations, (relation, column) =>
      mysql.format(`CONSTRAINT ?? FOREIGN KEY (??) REFERENCES ?? (??) ON DELETE ${relation.on_delete} ON UPDATE ${relation.on_update}`, [this.__type + ":" + column, column, relation.table, this.__primary])
    ));
  }
  
  protected static generateTimeFields(created: boolean = true, updated: boolean = true, deleted: boolean = false): { [key: string]: iObjectField } {
    const fields: { [key: string]: iObjectField } = {};
    if (created) { fields.time_created = {type: "bigint(14)", default: null, protected: true, onInsert: (o, v) => o.time_created = Date.now()}; }
    if (updated) { fields.time_updated = {type: "bigint(14)", default: null, protected: true, onUpdate: (o, v) => o.time_updated = Date.now()}; }
    if (deleted) { fields.time_deleted = {type: "bigint(14)", default: null, protected: true, onDelete: (o, v) => o.time_deleted = Date.now()}; }
    return fields;
  }
  
  protected static generateTimeIndexes(created: boolean = true, updated: boolean = false, deleted: boolean = false): iObjectIndex {
    const indexes: iObjectIndex = {key: {}};
    if (created) { indexes.key.time_created = ["time_created"]; }
    if (updated) { indexes.key.time_updated = ["time_updated"]; }
    if (deleted) { indexes.key.time_deleted = ["time_deleted"]; }
    return indexes;
  }
  
  protected static generateUserFields(created: boolean = true, updated: boolean = false, deleted: boolean = false): { [key: string]: iObjectField } {
    const fields: { [key: string]: iObjectField } = {};
    if (created) { fields.user_created = {type: "binary(16)", default: null, protected: true, onInsert: (o, v) => _.get(v, "id", _.get(users, "server.id", null))}; }
    if (updated) { fields.user_updated = {type: "binary(16)", default: null, protected: true, onUpdate: (o, v) => _.get(v, "id", _.get(users, "server.id", null))}; }
    if (deleted) { fields.user_deleted = {type: "binary(16)", default: null, protected: true, onDelete: (o, v) => _.get(v, "id", _.get(users, "server.id", null))}; }
    return fields;
  }
  
  protected static generateUserIndexes(created: boolean = true, updated: boolean = false, deleted: boolean = false): iObjectIndex {
    const indexes: iObjectIndex = {key: {}};
    if (created) { indexes.key.user_created = ["user_created"]; }
    if (updated) { indexes.key.user_updated = ["user_updated"]; }
    if (deleted) { indexes.key.user_deleted = ["user_deleted"]; }
    return indexes;
  }
  
  protected static generateUserRelations(created: boolean = true, updated: boolean = false, deleted: boolean = false): iObjectRelationSet {
    const relations: iObjectRelationSet = {};
    if (created) { relations.user_created = {table: env.tables.default.names.user, on_delete: "NO ACTION", on_update: "CASCADE"}; }
    if (updated) { relations.user_updated = {table: env.tables.default.names.user, on_delete: "NO ACTION", on_update: "CASCADE"}; }
    if (deleted) { relations.user_deleted = {table: env.tables.default.names.user, on_delete: "NO ACTION", on_update: "CASCADE"}; }
    return relations;
  }
  
}

export interface iObjectRelationSet {
  [key: string]: iObjectRelation
}

export interface iObjectRelation {
  table: string
  on_delete: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
  on_update: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
}

export interface iObjectIndex {
  [key: string]: { [key: string]: string[] }
  
  key?: { [key: string]: string[] }
  unique_key?: { [key: string]: string[] }
  fulltext?: { [key: string]: string[] }
  spatial?: { [key: string]: string[] }
}

export interface iObjectField {
  [key: string]: any
  
  type?: any;
  required?: boolean
  protected?: boolean
  intermediate?: boolean
  onCreate?: (object: Element, value?: any) => any;
  onInsert?: (object: Element, invoker?: User) => any;
  onUpdate?: (object: Element, invoker?: User) => any;
  onDelete?: (object: Element, invoker?: User) => any;
}
