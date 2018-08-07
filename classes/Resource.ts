import Promise from "aigle";
import * as _ from "lodash";
import * as uuid from "uuid";
import {env} from "../app";
import * as Cache from "../modules/Cache";
import * as Database from "../modules/Database";
import * as Response from "../modules/Response";
import Table from "./Table";

@implement<iResource>()
export class Constructor {
  
  public static readonly __type: string;
  public static readonly __table: Table;
  
  private __uuid: string;
  private __id: Buffer;
  
  protected __exists: boolean = false;
  protected __validated: boolean = false;
  protected __database: string = "master";
  
  constructor(object?) {
    const $this = (<typeof Constructor>this.constructor);
    if (!$this.__table) { throw Error("Cannot initialize an instance of 'Resource' lacking a table definition."); }
    _.assign(this, object);
    if (!$this.__table.__options.junction) {
      this.id = object.id ? (Constructor.isUuid(object.id) ? Constructor.bufferFromUuid(this.uuid = object.id) : object.id) : Constructor.bufferFromUuid(this.uuid = uuid.v4());
      this.uuid = this.uuid || Constructor.uuidFromBuffer(this.id);
    }
    this.__database = <string>$this.__table.__options.database;
  }
  
  public get exists() {
    return this.__exists;
  }
  
  public get validated() {
    return this.__validated;
  }
  
  public get database() {
    return this.__database;
  }
  
  public get id() {
    return this.__id;
  }
  
  public set id(value: Buffer) {
    this.__id = value;
    this.__uuid = Constructor.uuidFromBuffer(value);
  }
  
  public get uuid() {
    return this.__uuid;
  }
  
  public set uuid(value: string) {
    this.__id = Constructor.bufferFromUuid(value);
  }
  
  public validate(update_protected: boolean = false, db?: Database.Pool): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const database = db || Database.namespace(env.mode);
    
    return Cache<this>("resource", $this.__type, this.getKeys())
    .catch(err => {
      if (err) { return Promise.reject(err); }
      return Cache("query", $this.__type, this.getKeys(), database.query($this.__table.validationSQL(this)))
      .then(res => _.merge(res[0] ? new $this(res[0]) : this, {__validated: true, __exists: !!res[0], __database: database.id}));
    })
    .then(res => _.reduce($this.__table.__columns, (r, v, k) =>
      console.log(k, res[k], r[k], v) ||
      v.primary_key || (!update_protected && (v.protected || !this[k])) ? _.set(r, k, res[k]) : r, this))
    .then(res => Cache("resource", $this.__type, this.getKeys(), res));
  }
  
  public save(db?: Database.Pool): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const database = db || Database.namespace(env.mode);
    return this.validate(this.__validated, database)
    .then(res => console.log(res) || Cache("resource", $this.__type, this.getKeys(), database.query(_.invoke($this.__table, this.__exists ? "updateSQL" : "insertSQL", this)))
      .then(() => _.set(this, "__exists", true))
    );
  }
  
  public toObject(shallow?: boolean): Promise<Partial<this>> {
    const $this = (<typeof Constructor>this.constructor);
    return Promise.reduce(_.omitBy($this.__table.__columns, v => v.hidden), (r, v, k) => {
      const [datatype, type, value] = _.reduce(v.type.match(/([^()]*)(?:\((.*)\))?/), (r, v, k) => _.set(r, k, v), Array(3).fill(0));
      if (type === "binary") {
        if (value === "16") {
          if (!shallow && v.relation && (_.isString(v.relation) || _.isPlainObject(v.relation) || _.size(v.relation) === 1)) {
            return new Table.tables[this.__database || env.mode][_.get(v, "relation.table", v.relation)].__resource({id: this[k]}).validate()
            .then(res => res.toObject())
            .then(res => _.set(r, k, res));
          }
          return _.set(r, k, Constructor.uuidFromBuffer(this[k]));
        }
        return _.set(r, k, (<Buffer>this[k]).toString("hex"));
      }
      if (type === "varbinary") { return _.set(r, k, (<Buffer>this[k]).toString("utf8")); }
      if (type === "blob") { return _.set(r, k, (<Buffer>this[k]).toString("base64")); }
      return _.set(r, k, this[k]);
    }, {})
    .then(res => res)
    .catch(err => err);
  }
  
  public getKeys() {
    const $this = (<typeof Constructor>this.constructor);
    const keys = [];
    if (this.__validated) { keys.push(_.map($this.__table.getPrimaryKeys(), v => Constructor.uuidFromBuffer(this[v]))); }
    _.each($this.__table.getUniqueKeys(), set => _.every(set, v => this[v]) && keys.push(_.map(set, v => this[v])));
    return keys;
  }
  
  public delete(db?: Database.Pool): Promise<this> {
    return new Promise(resolve => { return resolve(this); });
  }
  
  public static get(start?: number, limit?: number, where?: {[key: string]: any}, db?: Database.Pool): Promise<Response.JSON> {
    const time_started = Date.now();
    const database = db || Database.namespace(env.mode);
    start = start > 0 ? +start : 0;
    limit = limit > 0 && limit < 100 ? +limit : 100;
    return database.query(this.__table.selectSQL(start, limit, where))
    .map(row => new this(row).toObject())
    .then(res => new Response.JSON(200, "any", res, time_started))
    .catch(err => new Response.JSON(500, "any", err, time_started));
  }
  
  public static getBy(where?: {[key: string]: any}, db?: Database.Pool): Promise<Response.JSON> {
    const time_started = Date.now();
    const database = db || Database.namespace(env.mode);
    return database.query(this.__table.selectSQL(0, 1, where))
    .then(res => res.length > 0 ? new Response.JSON(200, "any", new this(res[0]).toObject(), time_started) : new Response.JSON(404, "any", null, time_started))
    .catch(() => new Response.JSON(500, "any", {}, time_started));
  }
  
  public static count(where?: {[key: string]: any}, db?: Database.Pool): Promise<Response.JSON> {
    const time_started = Date.now();
    const database = db || Database.namespace(env.mode);
    return database.query(this.__table.countSQL(where))
    .then(res => new Response.JSON(200, "any", res[0].count, time_started))
    .catch(() => new Response.JSON(500, "any", {}, time_started));
  }
  
  public static isUuid(uuid: string): boolean {
    return !!`${uuid}`.match(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  }
  
  public static bufferFromUuid(uuid: string): Buffer {
    if (!uuid.match(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/)) { return Buffer.from(uuid, "hex"); }
    return Buffer.alloc(16, uuid.replace(/-/g, ""), "hex");
  }
  
  public static uuidFromBuffer(buffer: Buffer): string {
    const hex = buffer.toString("hex");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }
  
}

export function implement<T>() {
  return (constructor: T) => {};
}

export interface iResource {
  __type: string;
  __table: Table;
  isUuid: (uuid: string) => boolean
  bufferFromUuid: (uuid: string) => Buffer
  uuidFromBuffer: (buffer: Buffer) => string
  
  [key: string]: any
  
  new(object?: {[key: string]: any}): iResourceInstance;
}

export interface iResourceInstance {
  database: string
  
  id: Buffer
  uuid?: string
  exists: boolean
  
  [key: string]: any;
  
  save: (db?: Database.Pool) => Promise<this>
  validate: (ignore_protections?: boolean, db?: Database.Pool) => Promise<this>
  delete: (db?: Database.Pool) => Promise<this>
}
