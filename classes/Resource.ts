import * as Promise from "bluebird";
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
  protected __exists: boolean = false;
  protected __validated: boolean = false;
  protected __database: string = "master";
  private __uuid?: string;
  private __id?: Buffer;
  
  constructor(object: iResourceInitializer = {}) {
    const $this = (<typeof Constructor>this.constructor);
    if (!$this.__table) { throw Error("Cannot initialize an instance of 'Resource' lacking a table definition."); }
    _.assign(this, object);
    if (!$this.__table.__options.junction) {
      this.id = object.id ? (Constructor.isUuid(<string>object.id) ? Constructor.bufferFromUuid(this.uuid = <string>object.id) : <Buffer>object.id) : Constructor.bufferFromUuid(this.uuid = uuid.v4());
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
  
  public validate(options: iResourceOptions = {}): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const $columns = $this.__table.__columns;
    const database = options.database || Database.namespace(env.mode);
    const keys = _.filter(!_.isUndefined(options.keys) ? _.concat(<string>options.keys) : this.getKeys());
    
    if (_.size(keys) === 0) { return Promise.reject(new Response.error(500, "cache", this)); }
    if (_.size(keys) === 1 || _.every(keys, key => !_.isArray(key))) {
      return Cache.try(Cache.types.RESOURCE, $this.__type, <Key[]>keys, () => {
        return Cache.try<iResourceQueryResult[]>(Cache.types.QUERY, $this.__type, <Key[]>keys, () => {
          return database.query($this.__table.validationSQL(this));
        }, _.assign({}, options.cache, {timeout: 0}))
        .then(query => _.assign(new $this(_.reduce(query, (target, rs) => _.assign(target, rs))), {__exists: true}));
      }, options.cache)
      .then(object => _.assign(_.reduce(object, (target, value, key) => {
        if (_.includes(["__id", "__uuid"], key) || !target[key] || ($columns[key] && ($columns[key].primary_key || (!options.update_protected && $columns[key].protected)))) {
          return _.set(target, key, value);
        }
        return target;
      }, this), {__validated: true, __database: database.id}))
      .catch(err => Promise.reject(err));
    }
    return Cache.get(Cache.types.RESOURCE, $this.__type, <Key[][]>keys)
    .then(promises => {
      const error = _.find(promises, promise => (<Response.error>promise).code !== 404 && (<Response.error>promise).type !== "any");
      if (error) { return Promise.reject(error); }
      const object: Constructor = _.reduce(promises, (target, promise) => promise instanceof Constructor ? _.assign({}, target, promise) : target, null);
      if (object && object.__validated) { return Promise.resolve(object); }
      return Cache.try<iResourceQueryResult[]>(Cache.types.QUERY, $this.__type, <Key[][]>keys, () => {
        return database.query($this.__table.validationSQL(this));
      }, _.assign({}, options.cache, {timeout: 0}))
      .then(queries => {
        const error = _.find(queries, query => <Error | iResourceQueryResult[]>query instanceof Error);
        if (error) { return Promise.reject(error); }
        return Promise.resolve(_.assign(new $this(), _.reduce(queries, (target, query: iResourceQueryResult[]) => _.assign(target, _.reduce(query, (t, row) => _.assign(t, new $this(row)), {})), {}), {__exists: true}));
      });
    })
    .then(object =>
      _.assign(_.reduce(object, (target, value, key) => {
        if (_.includes(["__id", "__uuid"], key) || !target[key] || ($columns[key] && ($columns[key].primary_key || (!options.update_protected && $columns[key].protected)))) {
          return _.set(target, key, value);
        }
        return target;
      }, this), {__validated: true, __database: database.id})
    )
    .catch(err => Promise.reject(err));
  }
  
  public save(options: iResourceOptions = {}): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const database = options.database || Database.namespace(env.mode);
    const keys = _.filter(!_.isUndefined(options.keys) ? _.concat(<string>options.keys) : this.getKeys());
    
    if (_.size(keys) === 0) { return Promise.reject(new Response.error(500, "cache", this)); }
    return this.validate(options)
    .then(() => {
      return Cache.set(Cache.types.RESOURCE, $this.__type, <Key[] | Key[][]>keys, () => {
        return Cache.set(Cache.types.QUERY, $this.__type, <Key[]>keys, () => {
          return database.query(_.invoke($this.__table, this.__exists ? "updateSQL" : "insertSQL", this));
        }, _.assign({}, options.cache, {timeout: 0}))
        .then(() => _.assign(this, {__exists: true}));
      });
    });
  }
  
  public toObject(shallow?: boolean): Promise<Partial<this>> {
    const $this = (<typeof Constructor>this.constructor);
    
    return <any>Promise.props(
      _.transform(_.omitBy($this.__table.__columns, v => v.hidden),
        (r, v, k) => {
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
        },
        {}
      )
    );
  }
  
  public getKeys(): string[] | string[][] {
    const $this = (<typeof Constructor>this.constructor);
    const keys = [];
    if (this.__validated || $this.__table.__options.junction) { keys.push(_.map($this.__table.getPrimaryKeys(), v => Constructor.uuidFromBuffer(this[v]))); }
    _.each($this.__table.getUniqueKeys(), set => _.every(set, v => !_.isUndefined(this[v])) && keys.push(_.map(set, v => this[v])));
    return keys;
  }
  
  public delete(db?: Database.Pool): Promise<this> {
    return new Promise(resolve => { return resolve(this); });
  }
  
  public static get(start?: number, limit?: number, where?: {[key: string]: any}, db?: Database.Pool): Promise<Response.json> {
    const time_started = Date.now();
    const database = db || Database.namespace(env.mode);
    
    start = start > 0 ? +start : 0;
    limit = limit > 0 && limit < 100 ? +limit : 100;
    
    return database.query(this.__table.selectSQL(start, limit, where))
    .map(row => new this(row).toObject())
    .then(res => new Response.json(200, "any", res, time_started))
    .catch(err => new Response.json(500, "any", err, time_started));
  }
  
  public static getBy(where?: {[key: string]: any}, db?: Database.Pool): Promise<Response.json> {
    const time_started = Date.now();
    const database = db || Database.namespace(env.mode);
    
    return database.query(this.__table.selectSQL(0, 1, where))
    .then(res => res.length > 0 ? new Response.json(200, "any", new this(res[0]).toObject(), time_started) : new Response.json(404, "any", null, time_started))
    .catch(() => new Response.json(500, "any", {}, time_started));
  }
  
  public static count(where?: {[key: string]: any}, db?: Database.Pool): Promise<Response.json> {
    const time_started = Date.now();
    const database = db || Database.namespace(env.mode);
    
    return database.query<{count: number}>(this.__table.countSQL(where))
    .then(res => new Response.json(200, "any", res[0].count, time_started))
    .catch(() => new Response.json(500, "any", {}, time_started));
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
  [key: string]: any
  
  new(object?: {[key: string]: any}): iResourceInstance;
  
  __type: string;
  __table: Table;
  isUuid: (uuid: string) => boolean
  bufferFromUuid: (uuid: string) => Buffer
  uuidFromBuffer: (buffer: Buffer) => string
}

export interface iResourceInstance {
  [key: string]: any;
  
  database: string
  
  id: Buffer
  uuid?: string
  exists: boolean
  
  save: (options: iResourceOptions) => Promise<this>
  validate: (options: iResourceOptions) => Promise<this>
  delete: (db?: Database.Pool) => Promise<this>
}

export interface iResourceInitializer {
  [key: string]: any
  
  id?: Buffer | string
  uuid?: string
}

interface iResourceOptions {
  database?: Database.Pool,
  update_protected?: boolean
  keys?: Key | Key[] | Key[][]
  cache?: {
    timeout?: number
  }
}

interface iResourceQueryResult {
  [key: string]: string | number | boolean | Buffer | Date
}

type Key = string | number;