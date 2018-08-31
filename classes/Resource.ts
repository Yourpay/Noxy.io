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
  
  public validate<T extends this>(options: iResourceOptions = {}): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const $columns = $this.__table.__columns;
    const database = Database(options.database || env.mode);
    const query_options: iResourceCacheOptions = _.assign({}, options.cache, {timeout: 0, collision_fallback: true});
    const keys = _.concat(_.get(options, "cache.keys", Cache.toKeys(this.getKeys())));
    
    if (keys.length === 0) { return Promise.reject(new Response.error(400, "cache", this)); }
    
    return Cache.getAny<T>(Cache.types.RESOURCE, $this.__type, keys)
    .catch(err => {
      if (err.code !== 404 || err.type !== "cache") { return Promise.reject(new Response.error(err.code, err.type, err)); }
      return Cache.set(Cache.types.QUERY, $this.__type, keys, () => {
        return database.queryOne($this.__table.validationSQL(this))
        .catch(err => err.code === 404 && err.type === "query" ? {} : Promise.reject(new Response.error(err.code, err.type, err)));
      }, query_options)
      .then(query => {
        return _.size(query) > 0 ? _.assign(new $this(query), {__exists: true}) : query;
      });
    })
    .then(resource => {
      return _.assign(
        _.reduce(resource, (target, value, key) => {
          if (_.includes(["__id", "__uuid"], key) || !target[key] || ($columns[key] && ($columns[key].primary_key || (!options.update_protected && $columns[key].protected)))) {
            return _.set(target, key, value);
          }
          return target;
        }, this),
        {__validated: true, __database: database.id}
      );
    });
  }
  
  public save(options: iResourceOptions = {}): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const database = Database(options.database || env.mode);
    const keys = _.concat(_.get(options, "cache.keys", Cache.toKeys(this.getKeys())));
    const query_options = _.assign({}, options.cache, {timeout: 0});
    
    if (keys.length === 0) { return Promise.reject(new Response.error(400, "cache", this)); }
    
    return this.validate(options)
    .then(() => {
      return Cache.set(Cache.types.RESOURCE, $this.__type, keys, () => {
        return database.query(_.invoke($this.__table, this.__exists ? "updateSQL" : "insertSQL", this))
        .then(() => _.assign(this, {__exists: true}));
      }, options.cache);
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
                Cache.getOne<Constructor>(Cache.types.RESOURCE, $this.__type, this[k])
                .catch(err => {
                  if (err.code !== 404 || err.type !== "cache") { return Promise.reject(new Response.error(err.code, err.type, err)); }
                  return new Table.tables[_.join([this.__database, _.get(v, "relation.table", v.relation)], "::")].__resource({id: this[k]}).validate();
                })
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
  
  public getKeys(): string[][] {
    const $this = (<typeof Constructor>this.constructor);
    const keys = [];
    keys.push(_.map($this.__table.getPrimaryKeys(), v => Constructor.uuidFromBuffer(this[v])));
    _.each($this.__table.getUniqueKeys(), set => _.every(set, v => !_.isUndefined(this[v])) && keys.push(_.map(set, v => this[v])));
    return keys;
  }
  
  public delete(db?: string): Promise<this> {
    return new Promise(resolve => { return resolve(this); });
  }
  
  public static get(start?: number, limit?: number, where?: {[key: string]: any}, db?: string): Promise<Response.json> {
    const time_started = Date.now();
    const database = Database(db || env.mode);
    
    start = start > 0 ? +start : 0;
    limit = limit > 0 && limit < 100 ? +limit : 100;
    
    return database.query(this.__table.selectSQL(start, limit, where))
    .map(row => new this(row).toObject())
    .then(res => new Response.json(200, "any", res, time_started))
    .catch(err => new Response.json(500, "any", err, time_started));
  }
  
  public static getBy(where?: {[key: string]: any}, db?: string): Promise<Response.json> {
    const time_started = Date.now();
    const database = Database(db || env.mode);
    
    return database.query<Constructor[]>(this.__table.selectSQL(0, 1, where))
    .then(res => res.length > 0 ? new Response.json(200, "any", new this(res[0]).toObject(), time_started) : new Response.json(404, "any", null, time_started))
    .catch(() => new Response.json(500, "any", {}, time_started));
  }
  
  public static count(where?: {[key: string]: any}, db?: string): Promise<Response.json> {
    const time_started = Date.now();
    const database = Database(db || env.mode);
    
    return database.query<{count: number}>(this.__table.countSQL(where))
    .then(res => new Response.json(200, "any", res[0].count, time_started))
    .catch(err => new Response.json(500, "any", err, time_started));
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
  delete: (db?: string) => Promise<this>
}

export interface iResourceInitializer {
  [key: string]: any
  
  id?: Buffer | string
  uuid?: string
}

interface iResourceOptions {
  database?: string,
  update_protected?: boolean
  cache?: iResourceCacheOptions
}

interface iResourceCacheOptions {
  keys?: string | string[]
  timeout?: number
  collision_fallback?: boolean | (() => Promise<any>)
}

interface iResourceQueryResult {
  [key: string]: string | number | boolean | Buffer | Date
}

