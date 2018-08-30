import * as Promise from "bluebird";
import * as _ from "lodash";
import {env} from "../app";
import {iTableColumn} from "../classes/Table";
import {tEnum, tNonFnProps} from "../interfaces/iAuxiliary";
import {eResourceType, iResource, iResourceCacheOptions, iResourceConstructor, iResourceOptions, iTable, iTableDefinition, iTableOptions} from "../interfaces/iResource";
import * as Cache from "./Cache";
import * as Response from "./Response";
import uuid = require("uuid");
import Database = require("./Database");

const resources = {};

function Default<T, R extends typeof Resource>(type: tEnum<T> & string, constructor: R, definition: iTableDefinition, options?: iTableOptions): R {
  
  const key = _.join([_.get(options, "database", env.databases[env.mode].database), type], "::");
  
  if (resources[key]) { throw new Response.error(500, "resource", {type: type, constructor: constructor}); }
  
  resources[key] = constructor;
  _.set(constructor, "type", type);
  _.set(constructor, "table", new Table(constructor, definition, options));
  return constructor;
}

function isUUID(uuid) {
  return !!`${uuid}`.match(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
}

function uuidFromBuffer(buffer: Buffer): string {
  const hex = buffer.toString("hex");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

function bufferFromUUID(uuid: string): Buffer {
  if (!isUUID(uuid)) { return Buffer.from(uuid, "hex"); }
  return Buffer.alloc(16, uuid.replace(/-/g, ""), "hex");
}

class Resource implements iResourceConstructor {
  
  public static readonly type: string;
  public static readonly table: Table;
  
  public id: Buffer;
  public uuid: string;
  
  constructor(initializer = {}) {
    let t_uuid = uuid.v4(), t_id = bufferFromUUID(t_uuid);
    Object.defineProperty(this, "id", {configurable: true, enumerable: true, get: () => t_id, set: v => { if (!_.isEqual(v, t_id)) { this.uuid = uuidFromBuffer(this.id = v); } }});
    Object.defineProperty(this, "uuid", {configurable: true, enumerable: true, get: () => t_uuid, set: v => { if (!_.isEqual(v, t_uuid)) { this.id = bufferFromUUID(this.uuid = v); } }});
    this.id = t_id;
  }
  
  public validate(options: iResourceOptions) {
    const $this = (<typeof Resource>this.constructor);
    const $columns = $this.table.definition;
    // const query_options: iResourceCacheOptions = _.assign({}, options.cache, {timeout: 0, collision_fallback: true});
    // const keys = _.concat(_.get(options, "cache.keys", Cache.toKeys(this.getKeys())));
    
    return $this.table.validate(this, {})
    .then(res => {
      res.id;
    })
    
    // return Cache.getAny<T>(Cache.types.RESOURCE, $this.__type, keys)
    // .catch(err => {
    //   if (err.code !== 404 || err.type !== "cache") { return Promise.reject(new Response.error(err.code, err.type, err)); }
    //   return Cache.set(Cache.types.QUERY, $this.__type, keys, () => {
    //     return database.queryOne($this.__table.validationSQL(this))
    //     .catch(err => err.code === 404 && err.type === "query" ? {} : Promise.reject(new Response.error(err.code, err.type, err)));
    //   }, query_options)
    //   .then(query => {
    //     return _.size(query) > 0 ? _.assign(new $this(query), {__exists: true}) : query;
    //   });
    // })
    // .then(resource => {
    //   return _.assign(
    //     _.reduce(resource, (target, value, key) => {
    //       if (_.includes(["__id", "__uuid"], key) || !target[key] || ($columns[key] && ($columns[key].primary_key || (!options.update_protected && $columns[key].protected)))) {
    //         return _.set(target, key, value);
    //       }
    //       return target;
    //     }, this),
    //     {__validated: true, __database: database.id}
    //   );
    // });
  }
  
}

class Table implements iTable {
  
  public readonly resource: typeof Resource;
  public readonly definition: iTableDefinition;
  public readonly options: iTableOptions;
  public readonly keys: string[][];
  
  constructor(resource: typeof Resource, definition: iTableDefinition, options?: iTableOptions) {
    this.resource = resource;
    this.definition = _.merge(options.junction ? {} : {id: {type: "binary(16)", primary_key: true, required: true, protected: true}}, definition);
    this.options = _.assign({database: env.mode}, options);
    this.keys = _.values(_.reduce(this.definition, (result, col, key) => {
      if (col.unique_index) { _.each(_.concat(col.unique_index), index => { result[index] = [...result[index] || [], key]; }); }
      if (col.index) { _.each(_.concat(col.index), index => { result[index] = [...result[index] || [], key]; }); }
      if (col.primary_key) { result["PRIMARY_KEY"] = [...result["PRIMARY_KEY"] || [], key]; }
      return result;
    }, {}));
  }
  
  public static toRelationColumn(table: string, hidden: boolean = false): iTableColumn {
    return {type: "binary(16)", required: true, protected: true, default: null, index: table, hidden: hidden, relation: table};
  }
  
  public static toTimeColumn(index?: string, hidden: boolean = false): iTableColumn {
    return {type: "bigint(13)", required: true, protected: true, default: null, index: index ? _.concat(index) : null, hidden: hidden};
  }
  
  public validate<T extends Resource>(resource: T, options?: iResourceCacheOptions): Promise<Exclude<tNonFnProps<T>, "uuid"> | {}> {
    const keys: {[key: string]: string}[] = _.reduce(this.keys, (result, keys) => _.every(keys, key => resource[key]) ? [...result, _.reduce(keys, (r, k) => _.set(r, k, resource[k]), {})] : result, []);
  
    if (_.size(keys) === 0) { return Promise.reject(new Response.error(400, "cache", this)); }
    
    return Cache.set<T | {}>(Cache.types.QUERY, this.resource.type, options.keys || _.map(keys, key => Cache.toKey(_.values(key))), () => {
      const where = _.join(_.map(this.keys, (key) => Database.parse(_.join(_.map(key, () => "?? = ?"), " AND "), _.flatten(_.toPairs(key)))), " OR ");
      return Database(this.options.database).queryOne<T>(Database.parse("SELECT * FROM ??" + (where.length ? `WHERE ${where}` : "") + " LIMIT 1", this.resource.type))
      .catch(err => err.code === 404 && err.type === "query" ? {} : Promise.reject(new Response.error(err.code, err.type, err)));
    }, options)
    
    // const keys = _.concat([_.values(this.getPrimaryKeys())], _.values(this.getUniqueKeys()));
    // const where = _.join(_.map(keys, index => _.join(_.map(index, v => Database.parse("?? = ?", [v, resource[v]])), " AND ")), " OR ");
    // return Database.parse(`SELECT * FROM ?? WHERE ${where}`, this.__resource.__type);
  }
  
}

Object.defineProperty(Default, "resources", {enumerable: true, value: resources});
Object.defineProperty(Default, "TYPES", {enumerable: true, value: eResourceType});
Object.defineProperty(Default, "uuidromBuffer", {value: uuidFromBuffer});
Object.defineProperty(Default, "bufferFromUUID", {value: bufferFromUUID});
Object.defineProperty(Default, "Table", {value: Table});
Object.defineProperty(Default, "Constructor", {value: Resource});

const exported = <iResource>Default;
export = exported;
