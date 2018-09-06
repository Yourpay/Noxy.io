import * as Promise from "bluebird";
import * as _ from "lodash";
import * as uuid from "uuid";
import {env} from "../app";
import {tEnum, tNonFnProps} from "../interfaces/iAuxiliary";
import {iDatabaseActionResult} from "../interfaces/iDatabase";
import {eResourceType, iReferenceDefinition, iResource, iResourceActionOptions, iTableColumn, iTableDefinition, iTableOptions} from "../interfaces/iResource";
import * as Cache from "./Cache";
import * as Database from "./Database";
import * as Response from "./Response";

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

class Resource {
  
  public static readonly type: string;
  public static readonly table: Table;
  
  public id: Buffer;
  public uuid: string;
  public validated: boolean;
  public exists: boolean;
  
  constructor(initializer = {}) {
    _.assign(this, initializer);
    let t_uuid = uuid.v4(), t_id = bufferFromUUID(t_uuid);
    Object.defineProperty(this, "id", {configurable: true, enumerable: true, get: () => t_id, set: v => { if (!_.isEqual(v, t_id)) { this.uuid = uuidFromBuffer(this.id = v); } }});
    Object.defineProperty(this, "uuid", {configurable: true, enumerable: true, get: () => t_uuid, set: v => { if (!_.isEqual(v, t_uuid)) { this.id = bufferFromUUID(this.uuid = v); } }});
    this.id = t_id;
  }
  
  public validate(options: iResourceActionOptions = {}): Promise<this> {
    const $this = (<typeof Resource>this.constructor);
    const $columns = $this.table.definition;
    
    return $this.table.validate(this, options)
    .then(res => _.assign(new $this(res), {exists: true}))
    .catch(err => err.code === 404 ? {} : Promise.reject(new Response.error(err.code, err.type, err)))
    .then(resource => {
      return _.assign(
        _.reduce(resource, (target, value, key) => {
          if (_.includes(["id", "uuid"], key) || !target[key] || ($columns[key] && ($columns[key].primary_key || (!options.update_protected && $columns[key].protected)))) {
            return _.set(target, key, value);
          }
          return target;
        }, this),
        {validated: true}
      );
    })
    .catch(err => Promise.reject(new Response.error(err.code, err.type, err)));
  }
  
  public save(options: iResourceActionOptions = {}) {
    const $this = (<typeof Resource>this.constructor);
    
    return this.validate(options)
    .then(res => $this.table.save(res, options))
    .catch(err => Promise.reject(new Response.error(err.code, err.type, err)));
  }
  
  public delete(options: iResourceActionOptions = {}) {
    
  }
  
  public toObject(shallow?: boolean): Promise<Partial<this>> {
    const $this = (<typeof Resource>this.constructor);
    
    return <any>Promise.props(
      _.transform(_.omitBy($this.table.definition, v => v.hidden),
        (r, v, k) => {
          const [datatype, type, value] = _.reduce(v.type.match(/([^()]*)(?:\((.*)\))?/), (r, v, k) => _.set(r, k, v), Array(3).fill(0));
          if (type === "binary") {
            if (value === "16") {
              if (!shallow && v.reference && (_.isString(v.reference) || _.isPlainObject(v.reference) || _.size(v.reference) === 1)) {
                Cache.getOne<Resource>(Cache.types.RESOURCE, $this.type, this[k])
                .catch(err => {
                  if (err.code !== 404 || err.type !== "cache") { return Promise.reject(new Response.error(err.code, err.type, err)); }
                  return new resources[_.join([$this.table.options.database, _.get(v, "relation.table", v.reference)], "::")].__resource({id: this[k]}).validate();
                })
                .then(res => res.toObject())
                .then(res => _.set(r, k, res));
              }
              return _.set(r, k, uuidFromBuffer(this[k]));
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
  
}

class Table {
  
  public readonly resource: typeof Resource;
  public readonly definition: iTableDefinition;
  public readonly options: iTableOptions;
  public readonly keys: string[][];
  
  constructor(resource: typeof Resource, definition: iTableDefinition, options?: iTableOptions) {
    this.resource = resource;
    this.definition = options.junction ? {...definition} : {id: {type: "binary(16)", primary_key: true, required: true, protected: true}, ...definition};
    this.options = {database: env.mode, ...options};
    this.keys = _.values(_.reduce(this.definition, (result, col, key) => {
      if (col.unique_index) { _.each(_.concat(col.unique_index), index => { result[index] = [...result[index] || [], key]; }); }
      if (col.primary_key) { result["PRIMARY_KEY"] = [...result["PRIMARY_KEY"] || [], key]; }
      return result;
    }, {}));
    
  }
  
  public static toRelationColumn(table: string, hidden: boolean = false): iTableColumn {
    return {type: "binary(16)", required: true, protected: true, default: null, index: table, hidden: hidden, reference: table};
  }
  
  public static toTimeColumn(index?: string, hidden: boolean = false): iTableColumn {
    return {type: "bigint(13)", required: true, protected: true, default: null, index: index ? _.concat(index) : null, hidden: hidden};
  }
  
  public validate(resource: Resource, options: iResourceActionOptions = {}): Promise<tNonFnProps<Resource>> {
    const keys: {[key: string]: string}[] = _.reduce(this.keys, (result, keys) => _.every(keys, key => resource[key]) ? [...result, _.reduce(keys, (r, k) => _.set(r, k, resource[k]), {})] : result, []);
    const cache_keys = options.keys || _.map(keys, key => Cache.toKey(_.values(key)));
    
    if (_.size(keys) === 0) { return Promise.reject(new Response.error(400, "cache", {keys: keys, object: resource})); }
    
    return Cache.getAny<tNonFnProps<Resource>>(Cache.types.RESOURCE, this.resource.type, cache_keys)
    .catch(err => {
      if (err.code !== 404) { return Promise.reject(new Response.error(err.code, err.type, err)); }
      const where = _.join(_.map(keys, (key) => _.join(_.map(key, (v, k) => Database.parse("?? = ?", [k, v])), " AND ")), " OR ");
      if (!where.length) { return Promise.reject(new Response.error(400, "cache", {keys: keys, object: resource})); }
      return Cache.set<tNonFnProps<Resource>>(Cache.types.VALIDATE, this.resource.type, cache_keys, () => {
        return Database(this.options.database).queryOne<tNonFnProps<Resource>>(`SELECT * FROM ?? WHERE ${where} LIMIT 1`, this.resource.type);
      }, {timeout: 0, collision_fallback: true});
    });
  }
  
  public save(resource: Resource, options: iResourceActionOptions = {}): Promise<Resource> {
    const keys: {[key: string]: string}[] = _.reduce(this.keys, (result, keys) => _.every(keys, key => resource[key]) ? [...result, _.reduce(keys, (r, k) => _.set(r, k, resource[k]), {})] : result, []);
    const cache_keys = options.keys || _.map(keys, key => Cache.toKey(_.values(key)));
    
    if (_.size(keys) === 0) { return Promise.reject(new Response.error(400, "cache", {keys: keys, object: resource})); }
    if (!resource.validated) { return Promise.reject(new Response.error(400, "resource", this)); }
    
    if (resource.exists) {
      const where = _.join(_.map(keys, (key) => _.join(_.map(key, (v, k) => Database.parse("?? = ?", [k, v])), " AND ")), " OR ");
      if (!where.length) { return Promise.reject(new Response.error(400, "cache", {keys: keys, object: resource})); }
    }
    
    return Cache.set<iDatabaseActionResult>(Cache.types.SAVE, this.resource.type, cache_keys, () => {
      const set = [this.resource.type, _.pick(resource, _.keys(this.definition))];
      if (resource.exists) { return Database(this.options.database).query<iDatabaseActionResult>(`UPDATE ?? SET ? WHERE {where}`, _.concat(set)); }
      return Database(this.options.database).query<iDatabaseActionResult>("INSERT INTO ?? SET ?", _.concat(set));
    }, {timeout: 0, collision_fallback: true})
    .then(res => {
      if (res.affectedRows === 0) { return Promise.reject(new Response.error(500, "resource", {keys: keys, object: resource})); }
      return Cache.set(Cache.types.RESOURCE, this.resource.type, cache_keys, resource, options);
    });
  }
  
  public delete(resource: Resource, options: iResourceActionOptions = {}) {
    
  }
  
  public toSQL(): string {
    return _.template("CREATE ${temporary} TABLE ${exists} ${name} ${definition} ${table_options} ${partition_options}")({
      temporary:         this.options.temporary ? "TEMPORARY" : "",
      exists_check:      this.options.exists_check ? "IF NOT EXISTS" : "",
      name:              this.resource.type,
      definition:        Table.sqlFromDefinition(this.definition),
      table_options:     "",
      partition_options: ""
    });
  }
  
  private static sqlFromDefinition(definition: iTableDefinition): string {
    return _.template("($columns)")({
      columns: _.join(_.map(definition, column =>
        console.log(column) ||
        console.log("default", column.default ? "DEFAULT " + (column.default === null ? "NULL" : column.default.toString()) : "") ||
        _.template("${data_type} ${null} ${default_value} ${ai} ${unique} ${primary} ${comment} ${format} ${reference}")({
          data_type: column.type,
          null:      column.null ? "NULL" : "NOT NULL",
          default_value:   column.default ? "DEFAULT " + (column.default === null ? "NULL" : column.default.toString()) : "",
          ai:        column.auto_increment ? "AUTO_INCREMENT" : "",
          unique:    column.unique_index,
          primary:   column.primary_key,
          comment:   column.comment,
          format:    column.column_format ? column.column_format : "",
          reference: column.reference ? Table.sqlFromReference(typeof column.reference === "string" ? column.reference : column.reference) : ""
        })
      ), " ")
    });
  }
  
  private static sqlFromReference(reference: string | iReferenceDefinition): string {
    reference = typeof reference === "string" ? {table: reference} : reference;
    return _.template("REFERENCES ${table} (${keys}) ${match} ${on_delete} ${on_update}")({
      table:     reference.table,
      keys:      reference.column ? reference.column : "id",
      match:     reference.match ? "MATCH " + reference.match : "",
      on_delete: reference.on_delete ? reference.on_delete : "CASCADE",
      on_update: reference.on_update ? reference.on_update : "CASCADE"
    });
  }
  
  private static sqlFromTableOptions(table_options: iTableDefinition): string {
    return "";
  }
  
  private static sqlFromPartitionOptions(partition_options: iTableDefinition): string {
    return "";
  }
  
}

Object.defineProperty(Default, "resources", {enumerable: true, value: resources});
Object.defineProperty(Default, "TYPES", {enumerable: true, value: eResourceType});
Object.defineProperty(Default, "uuidFromBuffer", {value: uuidFromBuffer});
Object.defineProperty(Default, "bufferFromUUID", {value: bufferFromUUID});
Object.defineProperty(Default, "Table", {value: Table});
Object.defineProperty(Default, "Constructor", {value: Resource});

const exported = <iResource>Default;
export = exported;
