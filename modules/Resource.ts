import * as Promise from "bluebird";
import * as _ from "lodash";
import {env} from "../app";
import {tEnum, tNonFnProps} from "../interfaces/iAuxiliary";
import {iDatabaseActionResult} from "../interfaces/iDatabase";
import {eResourceType, iResource, iResourceActionOptions, iTableColumn, iTableDefaultOptions, iTableDefinition, iTableIndexes, iTableOptions, iTablePartitionOptions} from "../interfaces/iResource";
import * as Cache from "./Cache";
import * as Database from "./Database";
import * as Response from "./Response";

const resources = {};

function Default<T>(type: tEnum<T> & string, constructor: typeof Resource, definition: iTableDefinition, options?: iTableOptions): typeof Resource {
  
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
  
  constructor(initializer: {id?: Buffer | string, uuid?: string} = {}) {
    const $this = (<typeof Resource>this.constructor);
    let t_id, t_uuid;
    if (initializer.id) {
      typeof initializer.id === "string" ? t_id = bufferFromUUID(t_uuid = initializer.id) : t_uuid = uuidFromBuffer(t_id = initializer.id);
    }
    else if (initializer.uuid) {
      t_uuid = initializer.uuid;
      t_id = bufferFromUUID(t_uuid);
    }
    Object.defineProperty(this, "id", {configurable: true, enumerable: true, get: () => t_id, set: v => { if (!_.isEqual(v, t_id)) { this.uuid = uuidFromBuffer(this.id = t_id = v); } }});
    Object.defineProperty(this, "uuid", {configurable: true, enumerable: true, get: () => t_uuid, set: v => { if (!_.isEqual(v, t_uuid)) { this.id = bufferFromUUID(this.uuid = t_uuid = v); } }});
    _.assign(this, _.assign({id: t_id}, initializer));
  }
  
  public validate(options: iResourceActionOptions = {}): Promise<this> {
    const $this = (<typeof Resource>this.constructor);
    const $columns = $this.table.definition;
    
    return $this.table.validate(this, options)
    .then(res => _.assign(new $this(res), {exists: true}))
    .catch(err => err.code === 404 ? Promise.resolve({exists: false}) : Promise.reject(new Response.error(err.code, err.type, err)))
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
  
  public remove(options: iResourceActionOptions = {}) {
    
  }
  
  public toObject(deep?: boolean): Promise<Partial<this>> {
    const $this = (<typeof Resource>this.constructor);
    
    return <any>Promise.props(
      _.transform(_.omitBy($this.table.definition, v => v.hidden),
        (r, v, k) => {
          const [datatype, type, value] = _.reduce(v.type.match(/([^()]*)(?:\((.*)\))?/), (r, v, k) => _.set(r, k, v), Array(3).fill(0));
          if (type === "binary") {
            if (value === "16") {
              if (deep && v.reference && (_.isString(v.reference) || _.isPlainObject(v.reference) || _.size(v.reference) === 1)) {
                Cache.getOne<Resource>(Cache.types.RESOURCE, $this.type, this[k])
                .catch(err => {
                  if (err.code !== 404 || err.type !== "cache") { return Promise.reject(new Response.error(err.code, err.type, err)); }
                  return new resources[_.join([$this.table.options.resource.database, _.get(v, "reference.table", v.reference)], "::")].__resource({id: this[k]}).validate();
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
  
  public static select(start: number = 0, limit: number = 100) {
    return this.table.select(start, limit)
    .map(resource => new this(resource))
    .catch(err => Promise.reject(new Response.error(err.code, err.type, err)));
  }
  
  public static selectByID(id: string | Buffer | {[key: string]: Buffer | string}) {
    return this.table.selectByID(id)
    .then(resource => new this(resource))
    .catch(err => Promise.reject(new Response.error(err.code, err.type, err)));
  }
  
  public static count() {
    return this.table.count()
    .catch(err => Promise.reject(new Response.error(err.code, err.type, err)));
  }
  
}

class Table {
  
  public readonly resource: typeof Resource;
  public readonly definition: iTableDefinition;
  public readonly options: iTableOptions;
  public readonly indexes: iTableIndexes = {primary: [], index: {}, unique: {}, spatial: {}, fulltext: {}};
  public readonly keys: string[][];
  
  constructor(resource: typeof Resource, definition: iTableDefinition, options?: iTableOptions) {
    this.resource = resource;
    this.options = _.merge({resource: {database: env.mode, exists_check: true}, table: {}, partition: {}}, options);
    this.definition = this.options.resource.junction ? definition : {id: {type: "binary(16)", primary_key: true, required: true, protected: true}, ...definition};
    this.indexes = _.reduce(this.definition, (result, col, key) => {
      if (col.primary_key) { result.primary.push(key); }
      if (col.index) {
        if (!_.isArray(col.index)) { this.definition[key].index = _.concat(this.definition[key].index); }
        _.each(col.index, index => { return result.index[index] = [...result.index[index] || [], key]; });
      }
      if (col.unique_index) {
        if (!_.isArray(col.unique_index)) { this.definition[key].unique_index = _.concat(this.definition[key].unique_index); }
        _.each(col.unique_index, index => { return result.unique[index] = [...result.unique[index] || [], key]; });
      }
      if (col.spatial_index) {
        if (!_.isArray(col.unique_index)) { this.definition[key].spatial_index = _.concat(this.definition[key].spatial_index); }
        _.each(col.spatial_index, index => { return result.spatial[index] = [...result.spatial[index] || [], key]; });
      }
      if (col.fulltext_index) {
        if (!_.isArray(col.fulltext_index)) { this.definition[key].fulltext_index = _.concat(this.definition[key].fulltext_index); }
        _.each(col.fulltext_index, index => { return result.fulltext[index] = [...result.fulltext[index] || [], key]; });
      }
      return result;
    }, this.indexes);
    this.keys = _.values(_.reduce(this.definition, (result, col, key) => {
      if (col.primary_key) { result["PRIMARY_KEY"] = [...result["PRIMARY_KEY"] || [], key]; }
      if (col.unique_index) { _.each(_.concat(col.unique_index), index => { result[index] = [...result[index] || [], key]; }); }
      return result;
    }, {}));
    
  }
  
  public static toReferenceColumn(table: string, hidden: boolean = false): iTableColumn {
    return {type: "binary(16)", required: true, protected: true, default: null, index: table, hidden: hidden, reference: table};
  }
  
  public static toTimeColumn(index?: string, hidden: boolean = false): iTableColumn {
    return {type: "bigint(13)", required: true, protected: true, default: null, index: index ? index : null, hidden: hidden};
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
        return Database(this.options.resource.database).queryOne<tNonFnProps<Resource>>(`SELECT * FROM ?? WHERE ${where} LIMIT 1`, this.resource.type);
      }, {timeout: 0, collision_fallback: true});
    });
  }
  
  public save(resource: Resource, options: iResourceActionOptions = {}): Promise<Resource> {
    let where = "";
    const keys: {[key: string]: string}[] = _.reduce(this.keys, (result, keys) => _.every(keys, key => resource[key]) ? [...result, _.reduce(keys, (r, k) => _.set(r, k, resource[k]), {})] : result, []);
    const cache_keys = options.keys || _.map(keys, key => Cache.toKey(_.values(key)));
    
    if (_.size(keys) === 0) { return Promise.reject(new Response.error(400, "cache", {keys: keys, object: resource})); }
    if (!resource.validated) { return Promise.reject(new Response.error(400, "resource", this)); }
    
    if (resource.exists) {
      where = _.join(_.map(this.indexes.primary, key => Database.parse("?? = ?", [key, resource[key]])), " AND ");
      if (!where.length) { return Promise.reject(new Response.error(400, "cache", {keys: keys, object: resource})); }
    }
    
    return Cache.set<iDatabaseActionResult>(Cache.types.SAVE, this.resource.type, cache_keys, () => {
      const set = [this.resource.type, _.pick(resource, _.keys(this.definition))];
      if (resource.exists) {
        return Database(this.options.resource.database).query<iDatabaseActionResult>(`UPDATE ?? SET ? WHERE ${where}`, _.concat(set));
      }
      return Database(this.options.resource.database).query<iDatabaseActionResult>("INSERT INTO ?? SET ?", _.concat(set));
    }, {timeout: 0, collision_fallback: true})
    .then(res => {
      if (res.affectedRows === 0) { return Promise.reject(new Response.error(500, "resource", {keys: keys, object: resource})); }
      return Cache.set(Cache.types.RESOURCE, this.resource.type, cache_keys, resource, options);
    });
  }
  
  public remove(resource: Resource, options: iResourceActionOptions = {}) {
    
  }
  
  public select(start: number = 0, limit: number = 100): Promise<Resource[]> {
    return Cache.setOne<Resource[]>(Cache.types.QUERY, this.resource.type, Cache.toKey([start, limit]), () => {
      return Database(this.options.resource.database).query<Resource[]>("SELECT * FROM ?? LIMIT ? OFFSET ?", [this.resource.type, limit, start]);
    }, {timeout: 0, collision_fallback: true});
  }
  
  public selectByID(id: string | Buffer | {[key: string]: Buffer | string}): Promise<Resource> {
    const keys = typeof id === "string" || id instanceof Buffer ? {id: id instanceof Buffer ? id : bufferFromUUID(id)} : id;
    return Cache.setOne<Resource>(Cache.types.QUERY, this.resource.type, Cache.toKey(_.values(id)), () => {
      const where = _.join(_.map(keys, (v, k) => Database.parse("?? = ?", [k, v])), " AND ");
      return Database(this.options.resource.database).query<Resource>(`SELECT * FROM ?? WHERE ${where}`);
    }, {timeout: 0, collision_fallback: true});
  }
  
  public count(): Promise<number> {
    return Cache.setOne<number>(Cache.types.QUERY, this.resource.type, "count", () => {
      return Database(this.options.resource.database).queryOne<{count: number}>("SELECT COUNT(1) as `count` FROM ??")
      .then(res => res.count);
    }, {timeout: 0, collision_fallback: true});
  }
  
  public toSQL(): string {
    return _.template("CREATE ${temporary} TABLE ${exists} `${name}` ${definition} ${table_options} ${partition_options}")({
      temporary:         this.options.resource.temporary ? "TEMPORARY" : "",
      exists:            this.options.resource.exists_check ? "IF NOT EXISTS" : "",
      name:              this.resource.type,
      definition:        Table.sqlFromDefinition(this),
      table_options:     Table.sqlFromTableOptions(this.options.table),
      partition_options: Table.sqlFromPartitionOptions(this.options.partition)
    }).replace(/\s{2,}/g, " ").replace(/^\s|\s$/g, "");
  }
  
  private static sqlFromDefinition(table: Table): string {
    return _.template("(${columns}, ${constraints})")({
      columns:     _.join(_.map(table.definition, (column, key) =>
        _.template("`${name}` ${data_type} ${is_null} ${default_value} ${ai} ${comment} ${format}")({
          name:          key,
          data_type:     _.toUpper(column.type),
          is_null:       column.null || column.default === null ? "NULL" : "NOT NULL",
          default_value: column.default !== undefined ? "DEFAULT " + (column.default !== null ? column.default.toString() : "NULL") : "",
          ai:            column.auto_increment ? "AUTO_INCREMENT" : "",
          collate:       column.collation ? "COLLATE " + column.collation : "",
          comment:       column.comment ? "COMMENT " + column.comment : "",
          format:        column.column_format ? "COLUMN_FORMAT " + column.column_format : ""
        }).replace(/\s{2,}/g, " ").replace(/^\s|\s$/g, "")
      ), ", "),
      constraints: _.join([
        Table.sqlFromIndexes(table.indexes),
        Table.sqlFromReferences(table)
      ], ", ").replace(/\s{2,}/g, " ").replace(/^\s|\s$|,\s*$/g, "")
    });
  }
  
  private static sqlFromIndexes(indexes) {
    return _.join(_.reduce(indexes, (result, index, type) => {
      if (type === "primary") { result.push(_.template("PRIMARY KEY (`${keys}`)")({keys: _.join(<string[]>index, "`, `")})); }
      else { _.each(index, (i, k) => { result.push(_.template("${index} INDEX `${name}` (`${keys}`)")({index: type !== "index" ? _.toUpper(type) : "", name: k, keys: _.join(i, "`, `")})); }); }
      return result;
    }, []), ", ");
  }
  
  private static sqlFromReferences(table: Table): string {
    return _.join(_.reduce(table.definition, (result, column, key) => {
      if (!column.reference || !column.reference) { return result; }
      const reference = typeof column.reference === "string" ? {table: column.reference} : column.reference;
      return _.concat(result, _.template("CONSTRAINT `${name}` FOREIGN KEY (`${column}`) REFERENCES `${table}` (`${keys}`) ${match} ON UPDATE ${on_update} ON DELETE ${on_delete}")({
        name:      table.resource.type + ":" + key,
        column:    key,
        table:     reference.table,
        keys:      reference.column ? reference.column : "id",
        match:     reference.match ? "MATCH " + reference.match : "",
        on_delete: reference.on_delete ? reference.on_delete : "CASCADE",
        on_update: reference.on_update ? reference.on_update : "CASCADE"
      }).replace(/\s{2,}/g, " ").replace(/^\s|\s$/g, ""));
    }, []), ", ");
  }
  
  private static sqlFromTableOptions(options: iTableDefaultOptions): string {
    return _.join(_.values({
      ai:     options.auto_increment ? `AUTO_INCREMENT = ${options.auto_increment}` : "",
      avg:    options.average_row_length ? `AVERAGE_ROW_LENGTH = ${options.average_row_length}` : "",
      char:   options.charset ? `CHARACTER SET = ${options.charset}` : "",
      chksum: options.checksum ? `CHECKSUM = ${options.checksum}` : "",
      clt:    options.collation ? `COLLATE = ${options.collation}` : "",
      cmnt:   options.comment ? `COMMENT = '${options.comment}'` : "",
      cmpr:   options.compression ? `COMPRESSION = '${options.compression}'` : "",
      con:    options.connection ? `CONNECTION = '${options.connection}'` : "",
      dir:    options.directory ? `DIRECTORY = '${options.directory}'` : "",
      delay:  _.isBoolean(options.delay_key_write) ? `DELAY_KEY_WRITE = ${options.delay_key_write ? "1" : "0"}` : "",
      enc:    _.isBoolean(options.encryption) ? `ENCRYPTION = '${options.encryption ? "Y" : "N"}'` : "",
      eng:    options.engine ? `ENGINE = ${options.engine}` : "",
      insert: options.insert_method ? `INSERT_METHOD = ${options.insert_method}` : "",
      kbsize: options.key_block_size ? `KEY_BLOCK_SIZE = ${options.key_block_size}` : "",
      min:    options.min_rows ? `MIN_ROWS = ${options.min_rows}` : "",
      max:    options.max_rows ? `MAX_ROWS = ${options.max_rows}` : "",
      pack:   _.isBoolean(options.pack_keys) || options.pack_keys === "DEFAULT" ? `PACK_KEYS = ${_.isString(options.pack_keys) ? "DEFAULT" : (options.pack_keys ? "1" : "0")}` : "",
      pwd:    options.password ? `PASSWORD = '${options.password}'` : "",
      fmt:    options.row_format ? `ROW_FORMAT = ${options.row_format}` : "",
      sar:    _.isBoolean(options.stats_auto_recalc) || options.stats_auto_recalc === "DEFAULT" ? `STATS_AUTO_RECALC = ${_.isString(options.stats_auto_recalc) ? "DEFAULT" : (options.stats_auto_recalc ? "1" : "0")}` : "",
      sp:     _.isBoolean(options.stats_persistent) || options.stats_persistent === "DEFAULT" ? `STATS_PERSISTENT = ${_.isString(options.stats_persistent) ? "DEFAULT" : (options.stats_persistent ? "1" : "0")}` : "",
      ssp:    options.stats_sample_pages ? `STATS_SAMPLE_PAGES = ${options.stats_sample_pages}` : "",
      tspace: options.tablespace ? `TABLESPACE = ${options.tablespace}` : "",
      union:  options.union ? `UNION = ${_.join(_.concat(options.union))}` : ""
    }), " ");
  }
  
  private static sqlFromPartitionOptions(partition_options: iTablePartitionOptions): string {
    return "";
  }
  
}

Object.defineProperty(Default, "list", {enumerable: true, value: resources});
Object.defineProperty(Default, "TYPES", {enumerable: true, value: eResourceType});
Object.defineProperty(Default, "uuidFromBuffer", {value: uuidFromBuffer});
Object.defineProperty(Default, "bufferFromUUID", {value: bufferFromUUID});
Object.defineProperty(Default, "Table", {value: Table});
Object.defineProperty(Default, "Constructor", {value: Resource});

const exported = <iResource>(<any>Default);
export = exported;
