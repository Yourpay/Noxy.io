import * as Promise from "bluebird";
import * as _ from "lodash";
import * as uuid from "uuid";
import {env} from "../globals";
import {tEnum, tEnumValue} from "../interfaces/iAuxiliary";
import {iDatabaseActionResult} from "../interfaces/iDatabase";
import {cResource, cTable, iResource, iResourceActionOptions, iResourceFn, iResourceService, iTable, iTableColumnLength, iTableDefaultOptions, iTableDefinition, iTableIndexes, iTableOptions, iTablePartitionOptions, tResourceObject, tTableColumn, tTableColumnTypes} from "../interfaces/iResource";
import * as Cache from "./Cache";
import * as Database from "./Database";
import * as Response from "./Response";

const Service: iResourceFn = function Default<T extends tEnum<T>, R extends cResource>(type: tEnumValue<T>, constructor: R, definition: iTableDefinition, options?: iTableOptions): R {
  
  const key = _.join([_.get(options, "database", env.databases[env.mode].database), type], "::");
  
  if (exported.list[key]) { throw Response.error(409, "resource", {type: type, constructor: constructor}); }
  
  exported.list[key] = constructor;
  _.set(constructor, "type", type);
  _.set(constructor, "table", new Table(constructor, definition, options));
  return constructor;
  
};

const Resource: cResource = class Resource implements iResource {
  
  public static table: iTable;
  public static type: string;
  
  public id: string | Buffer;
  public uuid: string;
  public exists: boolean;
  public validated: boolean;
  
  constructor(initializer: tResourceObject = {}) {
    const $this = (<typeof Resource>this.constructor);
    if (!(<cResource>this.constructor).table.options.resource.junction) {
      if (initializer.id) {
        this.id = typeof initializer.id === "string" ? bufferFromUUID(initializer.id) : initializer.id;
        this.uuid = typeof initializer.id === "string" ? initializer.id : uuidFromBuffer(initializer.id);
      }
      else if (initializer.uuid) {
        this.id = bufferFromUUID(initializer.uuid);
        this.uuid = initializer.uuid;
      }
      else {
        this.uuid = uuid.v4();
        this.id = bufferFromUUID(this.uuid);
      }
    }
    _.assign(this, _.omit(initializer, ["id", "uuid"]));
    _.each(this, (value, key) => {
      if ($this.table.definition[key] && $this.table.definition[key].reference && $this.table.definition[key].type === "binary" && (<iTableColumnLength<"binary">>$this.table.definition[key]).length === 16) {
        if (typeof this[key] === "string") { this[key] = bufferFromUUID(this[key]); }
        else if (this[key] instanceof $this) { this[key] = this[key].id; }
      }
    });
    this.validated = false;
    this.exists = false;
  }
  
  public validate(options: iResourceActionOptions = {}): Promise<this> {
    const $this = (<typeof Resource>this.constructor);
    const $columns = $this.table.definition;
    
    return $this.table.validate(this, options)
    .then(res => _.assign(new $this(res), {exists: true}))
    .catch(err => err.code === 404 ? Promise.resolve({exists: false}) : Promise.reject(Response.error(err.code, err.type, err)))
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
    .catch(err => Promise.reject(Response.error(err.code, err.type, err)));
  }
  
  public save(options: iResourceActionOptions = {}): Promise<this> {
    const $this = (<typeof Resource>this.constructor);
    
    return this.validate(options)
    .then(res => $this.table.save(res, options))
    .catch(err => Promise.reject(Response.error(err.code, err.type, err)));
  }
  
  public remove() {
    return Promise.resolve(this);
  }
  
  public getKeyValues(as_obj?: false, conv?: boolean): (string | number)[][]
  public getKeyValues(as_obj?: true, conv?: boolean): {[key: string]: string | number}[]
  public getKeyValues(as_obj?: boolean, conv?: boolean): {[key: string]: string | number}[] | (string | number)[][] {
    return _.reduce(
      (<typeof Resource>this.constructor).table.keys,
      (r, keys) => _.every(keys, k => !_.isUndefined(this[k])) ? [...r, _.reduce(keys, (r, k, i) => _.set(r, as_obj ? k : i, this[k] instanceof Buffer && conv ? uuidFromBuffer(this[k]) : this[k]), as_obj ? {} : [])] : r,
      []
    );
  }
  
  public toObject(deep?: boolean): Promise<Partial<this>> {
    const $this = (<typeof Resource>this.constructor);
    return <any>Promise.props(
      _.transform(_.omitBy($this.table.definition, v => v.hidden),
        (r, v, k) => {
          const [type, value] = _.tail(_.reduce(v.type.match(/([^()]*)(?:\((.*)\))?/), (r, v, k) => _.set(r, k, v), Array(3).fill(0)));
          if (type === "binary") {
            if (value === "16") {
              if (deep && v.reference && (_.isString(v.reference) || _.isPlainObject(v.reference) || _.size(v.reference) === 1)) {
                Cache.getOne<Resource>(Cache.types.RESOURCE, $this.type, this[k])
                .catch(err => {
                  if (err.code !== 404 || err.type !== "cache") { return Promise.reject(Response.error(err.code, err.type, err)); }
                  return new exported.list[_.join([$this.table.options.resource.database, _.get(v, "reference.table", v.reference)], "::")]({id: this[k]}).validate();
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
          if (type === "tinyint" && value === "1") { return _.set(r, k, !!this[k]); }
          return _.set(r, k, this[k]);
        },
        {}
      )
    );
  }
  
  public static select<T extends cResource>(this: T & {new(init: tResourceObject): iResource}, start: number = 0, limit: number = 100): Promise<InstanceType<T>[]> {
    return this.table.select(start, limit)
    .map(resource => <any>(new this(resource)))
    .catch(err => Promise.reject(Response.error(err.code, err.type, err)));
  }
  
  public static selectByID<T extends cResource>(this: T & {new(init: tResourceObject): InstanceType<T>}, id: string | Buffer | Resource): Promise<InstanceType<T> | InstanceType<T>[]> {
    return this.table.selectByID(id)
    .then(resource => _.isArray(resource) ? Promise.map(resource, r => <any>(new this(r))) : Promise.resolve(<any>(new this(resource))))
    .catch(err => Promise.reject(Response.error(err.code, err.type, err)));
  }
  
  public static count() {
    return this.table.count()
    .catch(err => Promise.reject(Response.error(err.code, err.type, err)));
  }
  
  public static get(start: number, limit: number): Promise<Partial<iResource>[]> {
    return this.select(start, limit).map(res => res.toObject());
  }
  
  public static getByID(id: string | Buffer | Resource): Promise<Partial<iResource> | Partial<iResource>[]> {
    return this.selectByID(id)
    .then(res => {
      
      return Promise.reduce(_.concat(res), (result, value) => { return value.toObject().then(v => _.concat(result, v)); }, [])
      .then(res => this.table.indexes.primary.length === 1 ? res[0] : res);
    });
  }
  
  public static post(resource: any): Promise<Partial<iResource>> {
    return new this(resource).validate()
    .then((res: iResource) => !res.exists ? res.save() : Promise.reject(Response.error(409, "resource")))
    .then(res => res.toObject());
  }
  
  public static put(resource: any): Promise<Partial<iResource>> {
    return new this(resource).validate()
    .then((res: iResource) => res.exists ? res.save() : Promise.reject(Response.error(409, "resource")))
    .then(res => res.toObject());
  }
  
  public static delete(id: string | Buffer): Promise<Partial<iResource>> {
    return new this({id: id}).validate()
    .then((res: iResource) => res.exists ? res.remove() : Promise.reject(Response.error(409, "resource")))
    .then(res => res.toObject());
  }
  
};

const Table: cTable = class Table implements iTable {
  
  public readonly resource: cResource;
  public readonly definition: iTableDefinition;
  public readonly options: iTableOptions;
  public readonly indexes: iTableIndexes = {primary: [], index: {}, unique: {}, spatial: {}, fulltext: {}};
  public readonly keys: string[][];
  
  constructor(resource: typeof Resource, definition: iTableDefinition, options?: iTableOptions) {
    this.resource = resource;
    this.options = _.merge({resource: {database: env.mode, exists_check: true}, table: {}, partition: {}}, options);
    this.definition = this.options.resource.junction ? definition : {id: {type: "binary", length: 16, primary_key: true, required: true, protected: true}, ...definition};
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
  
  public validate<T extends iResource>(resource: T, options: iResourceActionOptions = {}): Promise<T> {
    const cache_keys = options.keys || Cache.keysFromSets(resource.getKeyValues(false, true));
    if (_.size(cache_keys) === 0) { return Promise.reject(Response.error(400, "cache", {keys: cache_keys, object: resource})); }
    
    return Cache.getAny<T>(Cache.types.RESOURCE, this.resource.type, cache_keys)
    .catch(err => {
      if (err.code !== 404) { return Promise.reject(Response.error(err.code, err.type, err)); }
      return Cache.set<T>(Cache.types.VALIDATE, this.resource.type, cache_keys, () => {
        return Database(this.options.resource.database).queryOne<T>(`SELECT * FROM ?? WHERE ??? LIMIT 1`, [this.resource.type, resource.getKeyValues(true)]);
      }, {timeout: 0, collision_fallback: true});
    });
  }
  
  public save<T extends iResource>(resource: T, options: iResourceActionOptions = {}): Promise<T> {
    const cache_keys = options.keys || Cache.keysFromSets(resource.getKeyValues(false, true));
    if (_.size(cache_keys) === 0) { return Promise.reject(Response.error(400, "cache", {keys: cache_keys, object: resource})); }
    if (!resource.validated) { return Promise.reject(Response.error(400, "resource", this)); }
    
    return Cache.set<T>(Cache.types.RESOURCE, this.resource.type, cache_keys, () => {
      return (resource.exists ? this.update(resource) : this.insert(resource))
      .then(res => {
        if (res.affectedRows === 0) { return Promise.reject(Response.error(500, "resource", {keys: cache_keys, object: resource})); }
        return Promise.resolve(_.set(resource, "exists", true));
      });
    }, {timeout: 0, collision_fallback: true});
  }
  
  public remove<T extends iResource>(resource: T, options: iResourceActionOptions = {}): Promise<T> {
    return Promise.resolve(resource);
  }
  
  public select(start: number = 0, limit: number = 100): Promise<tResourceObject[]> {
    return Cache.setOne<tResourceObject[]>(Cache.types.QUERY, this.resource.type, Cache.keyFromSet([start, limit]), () => {
      return Database(this.options.resource.database).query<tResourceObject[]>("SELECT * FROM ?? LIMIT ? OFFSET ?", [this.resource.type, limit, start]);
    }, {timeout: 0, collision_fallback: true});
  }
  
  public selectByID(id: string | Buffer | iResource): Promise<tResourceObject[]> {
    let value: Buffer[], keys: string[];
    if (typeof id === "string") {
      keys = [id];
      value = [bufferFromUUID(id)];
    }
    else if (id instanceof Buffer) {
      keys = [uuidFromBuffer(id)];
      value = [id];
    }
    else {
      const $this = (<typeof Resource>id.constructor);
      keys = _.map($this.table.indexes.primary, i => id[i]);
      value = _.map($this.table.indexes.primary, i => id[i]);
    }
    return Cache.setOne<tResourceObject[]>(Cache.types.QUERY, this.resource.type, Cache.keyFromSet(keys), () => {
      const where = _.join(_.map(this.indexes.primary, k => Database.parse("?? IN (?)", [k, value])), " OR ");
      return Database(this.options.resource.database).query<tResourceObject[]>(`SELECT * FROM ?? WHERE ${where}`, this.resource.type);
    }, {timeout: 0, collision_fallback: true});
  }
  
  public insert(resource: iResource): Promise<iDatabaseActionResult> {
    return Database(this.options.resource.database).query<iDatabaseActionResult>("INSERT INTO ?? SET ?", [this.resource.type, _.pick(resource, _.keys(this.definition))]);
  }
  
  public update(resource: iResource): Promise<iDatabaseActionResult> {
    return Database(this.options.resource.database).query<iDatabaseActionResult>(
      "UPDATE ?? SET ? WHERE ???",
      [this.resource.type, _.pick(resource, _.keys(this.definition)), _.reduce(this.indexes.primary, (r, k) => _.set(r, k, resource[k]), {})]
    );
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
          data_type:     this.sqlFromDataType(column),
          is_null:       column.null || column.default === null ? "NULL" : "NOT NULL",
          default_value: column.default !== undefined ? "DEFAULT " + (column.default !== null ? (column.default.toString() === "" ? "''" : column.default.toString()) : "NULL") : "",
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
    return partition_options ? "" : "";
  }
  
  private static sqlFromDataType(column) {
    return _.template("${type}${length} ${unsigned} ${zerofill}")({
      type:     column.type,
      length:   column.length ? `(${column.length})` : (column.scale ? `(${column.scale})` : (column.precision ? `(${column.precision},${column.scale})` : (column.values ? `('${_.join(column.values, "','")}')` : ""))),
      unsigned: column.unsigned ? "UNSIGNED" : "",
      zerofill: column.zerofill ? "ZEROFILL" : ""
    });
  }
  
  public static toPrimaryColumn<T extends tEnum<T>>(reference?: tEnumValue<T> & string, hidden?: boolean): tTableColumn<tTableColumnTypes> {
    return {type: "binary", length: 16, required: true, protected: true, primary_key: true, index: reference ? reference : null, hidden: hidden, reference: reference};
  }
  
  public static toReferenceColumn<T extends tEnum<T>>(reference: tEnumValue<T> & string, hidden: boolean = false): tTableColumn<tTableColumnTypes> {
    return {type: "binary", length: 16, required: true, protected: true, default: null, index: reference, hidden: hidden, reference: reference};
  }
  
  public static toTimeColumn(index?: string, hidden: boolean = false): tTableColumn<tTableColumnTypes> {
    return {type: "bigint", length: 13, required: true, protected: true, default: null, index: index ? index : null, hidden: hidden};
  }
  
  public static toFlagColumn(dflt: boolean = false, hidden: boolean = false): tTableColumn<tTableColumnTypes> {
    return {type: "tinyint", length: 1, required: true, protected: true, default: dflt ? 1 : 0, hidden: hidden};
  }
  
};

function isUUID(uuid) {
  return !!`${uuid}`.match(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
}

function bufferFromUUID(uuid: string): Buffer {
  if (!isUUID(uuid)) { return Buffer.from(uuid, "hex"); }
  return Buffer.alloc(16, uuid.replace(/-/g, ""), "hex");
}

function uuidFromBuffer(buffer: Buffer): string {
  const hex = buffer.toString("hex");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

function toKey(string: string): string {
  return string || string.replace(/\s/g, "") === "" ? _.snakeCase(_.deburr(string)) : undefined;
}

const exported: iResourceService = _.assign(
  Service,
  {
    Constructor:    Resource,
    Table:          Table,
    list:           {},
    toKey:          toKey,
    isUUID:         isUUID,
    bufferFromUUID: bufferFromUUID,
    uuidFromBuffer: uuidFromBuffer
  }
);

export = exported;
