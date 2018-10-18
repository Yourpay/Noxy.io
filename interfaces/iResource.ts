import * as Promise from "bluebird";

import {Omit, tEnum, tEnumValue, tNonFnPropsOptional} from "./iAuxiliary";

export interface iResourceService extends iResourceFn {
  Table: cTable
  Constructor: cResource
  
  list: {[key: string]: cResource}
  
  toKey: (string: string) => string
  uuidFromBuffer: (buffer: Buffer) => string
  bufferFromUUID: (uuid: string) => Buffer
}

export interface iResourceFn {
  <T extends tEnum<T>>(type: tEnumValue<T>, constructor: cResource, definition: iTableDefinition, options?: iTableOptions): cResource
}

export interface cResource {
  new(initializer?: tResourceInitializer<any>): iResource
  
  table: iTable
  type: string
  
  select<T extends cResource>(this: T & {new(init: tResourceObject): InstanceType<T>}, start: number, limit: number): Promise<InstanceType<T>[]>
  
  selectByID<T extends cResource>(this: T & {new(init: tResourceObject): InstanceType<T>}, id: string | Buffer | iResource): Promise<InstanceType<T> | InstanceType<T>[]>
  
  count(): Promise<number>
  
  get(start?: number, limit?: number): Promise<Partial<iResource>[]>
  
  getByID(id?: string | Buffer | iResource): Promise<Partial<iResource> | Partial<iResource>[]>
  
  post(resource: any): Promise<Partial<iResource>>
  
  put(resource: any): Promise<Partial<iResource>>
  
  delete(id?: string | Buffer): Promise<Partial<iResource>>
}

export interface iResource {
  id?: string | Buffer
  uuid?: string
  exists: boolean
  validated: boolean
  
  validate(options?: iResourceActionOptions): Promise<this>
  
  save(options?: iResourceActionOptions): Promise<this>
  
  remove(options?: iResourceActionOptions): Promise<this>
  
  getKeys(): (string | number)[][]
  
  toObject(deep?: boolean): Promise<Partial<this>>
}

export interface cTable {
  new(resource: cResource, definition: iTableDefinition, options?: iTableOptions)
  
  toPrimaryColumn: <T extends tEnum<T>>(reference?: tEnumValue<T> & string, hidden?: boolean) => tTableColumn<tTableColumnTypes>
  toReferenceColumn: <T extends tEnum<T>>(table: tEnumValue<T> & string, hidden?: boolean) => tTableColumn<tTableColumnTypes>
  toTimeColumn: (index?: string, hidden?: boolean) => tTableColumn<tTableColumnTypes>
  toFlagColumn: (hidden?: boolean) => tTableColumn<tTableColumnTypes>
  sqlFromTable: (table: iTable) => string;
  sqlFromColumn: <T extends tTableColumnTypes>(name: string, column: tTableColumn<T>) => string;
}

export interface iTable {
  readonly resource: cResource;
  readonly definition: iTableDefinition;
  readonly options: iTableOptions;
  readonly indexes: iTableIndexes;
  readonly keys: string[][];
  
  validate: <T extends iResource>(resource: T, options?: iResourceActionOptions) => Promise<T>
  save: <T extends iResource>(resource: T, options?: iResourceActionOptions) => Promise<T>
  remove: <T extends iResource>(resource: T, options?: iResourceActionOptions) => Promise<T>
  select: (start?: number, limit?: number) => Promise<tResourceObject[]>
  selectByID: (id: string | Buffer | iResource) => Promise<tResourceObject | tResourceObject[]>
  count: () => Promise<number>
  toSQL: () => string
}

export interface iResourceMethodOptions {
  collision_fallback?: boolean | (() => Promise<any>)
  timeout?: number
  keys?: string[]
}

export interface iResourceActionOptions extends iResourceMethodOptions {
  update_protected?: boolean
}

export interface iTableOptions {
  resource?: iTableResourceOptions
  table?: iTableDefaultOptions
  partition?: iTablePartitionOptions
}

export interface iTableResourceOptions {
  /* The database that this table should be assigned to, defaults to environment defined database. */
  database?: string
  /* Is the table a junction table? If it is, the ID column will not be added automatically. */
  junction?: boolean
  /* Is the table a temporary table? */
  temporary?: boolean
  /* Should the 'IF EXISTS' clause be added? */
  exists_check?: boolean
}

export interface iTableDefaultOptions {
  /* Where should the auto_increment start from */
  auto_increment?: number
  /* Which value the avg_row_length parameter should default to */
  average_row_length?: number
  charset?: string
  checksum?: boolean
  comment?: string
  /* The default collation to use with the table */
  collation?: "utf8mb4_unicode_ci" | string
  compression?: "ZLIB" | "LZ4" | "NONE"
  connection?: string
  directory?: string
  delay_key_write?: boolean
  encryption?: boolean
  /* The database engine to run the table under */
  engine?: "InnoDB" | "MyISAM" | "Aria" | "CSV" | string
  insert_method?: "NO" | "FIRST" | "LAST"
  key_block_size?: number
  max_rows?: number
  min_rows?: number
  pack_keys?: boolean | "DEFAULT"
  password?: string
  row_format?: "DEFAULT" | "DYNAMIC" | "FIXED" | "COMPRESSED" | "REDUNDANT" | "COMPACT"
  stats_auto_recalc?: boolean | "DEFAULT"
  stats_persistent?: boolean | "DEFAULT"
  stats_sample_pages?: number
  tablespace?: string
  union?: string | string[]
}

export interface iTablePartitionOptions {

}

export interface iTableDefinition {
  [key: string]: tTableColumn<tTableColumnTypes>
}

interface iTableColumnBase {
  /* Can this field be a NULL value */
  null?: boolean
  
  /* What should this field's default value be (Note: NULL as default set the NULL flag to true) */
  default?: string | number
  
  /* Must the field contain a value */
  required?: boolean
  
  /* Should the value be modifiable from outside the server */
  protected?: boolean
  
  /* Should this column appear in result sets after being parsed? */
  hidden?: boolean
  
  /* Which "key" indexes should this column be part of */
  index?: string | string[]
  
  /* Which "unique" indexes should this column be part of */
  unique_index?: string | string[]
  
  /* Which "fulltext" indexes should this column be part of */
  fulltext_index?: string | string[]
  
  /* Which "spatial" indexes should this column be part of */
  spatial_index?: string | string[]
  
  /* Is this part of the primary key? */
  primary_key?: boolean
  
  /* Defines the foreign key relations this column has to another */
  reference?: string | iReferenceDefinition
  
  /* The default collation to use with the column */
  collation?: "utf8mb4_unicode_ci" | string
  
  /* Add a comment to the column in the database */
  comment?: string
  
  /* Should the column be an auto_increment column */
  auto_increment?: boolean
  
  /* The kind of format the columns should follow */
  column_format?: "FIXED" | "DYNAMIC" | "DEFAULT"
  
  /* Should this column be converted to a boolean when converting it to an object? */
  flag?: boolean
}

/* The MySQL denoted type */
export type tTableColumnTypes =
  "tinyint" | "smallint" | "mediumint" | "int" | "bigint" | "bit" |
  "float" | "double" | "decimal" | "numeric" |
  "char" | "varchar" | "tinytext" | "text" | "mediumtext" | "longtext" | "json" |
  "binary" | "varbinary" | "tinyblob" | "blob" | "mediumblob" | "longblob" |
  "date" | "time" | "year" | "datetime" | "timestamp" |
  "point" | "linestring" | "polygon" | "geometry" | "multipoint" | "multilinestring" | "multipolygon" | "geometrycollection" |
  "enum" | "set";

export type tTableColumnLengthTypes = "tinyint" | "smallint" | "mediumint" | "int" | "bigint" | "bit" | "char" | "varchar" | "binary" | "varbinary";
export type tTableColumnDecimalTypes = "float" | "double" | "decimal" | "numeric";
export type tTableColumnPrecisionTypes = "time" | "datetime" | "timestamp";
export type tTableColumnSetTypes = "enum" | "set";

export type tTableColumn<T> = T extends tTableColumnTypes & tTableColumnLengthTypes ? iTableColumnLength<T> :
                              T extends tTableColumnTypes & tTableColumnDecimalTypes ? iTableColumnDecimal<T> :
                              T extends tTableColumnTypes & tTableColumnPrecisionTypes ? iTableColumnPrecision<T> :
                              T extends tTableColumnTypes & tTableColumnSetTypes ? iTableColumnSet<T> :
                              iTableColumnAny<T>

export interface iTableColumnLength<T> extends iTableColumnBase {
  type: T
  length: number;
}

export interface iTableColumnDecimal<T> extends iTableColumnBase {
  type: T
  precision: number;
  scale: number;
}

export interface iTableColumnPrecision<T> extends iTableColumnBase {
  type: T
  precision: number;
}

export interface iTableColumnSet<T> extends iTableColumnBase {
  type: T
  values: string[];
}

export interface iTableColumnAny<T> extends iTableColumnBase {
  type: T
}

export interface iTableIndexes {
  primary: string[],
  index: {[key: string]: string[]}
  unique: {[key: string]: string[]}
  spatial: {[key: string]: string[]}
  fulltext: {[key: string]: string[]}
}

export interface iReferenceDefinition {
  database?: string
  table: string
  column?: string
  match?: "FULL" | "PARTIAL" | "SIMPLE"
  on_delete?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
  on_update?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
}

export type tResourceObject = Omit<tNonFnPropsOptional<iResource>, "exists" | "validated">
export type tResourceInitializer<T extends Omit<tNonFnPropsOptional<T>, "exists" | "validated">> = T & {id?: Buffer | string, uuid?: string}

export enum eResourceType {
  "USER"       = "user",
  "ROLE"       = "role",
  "ROLE_USER"  = "role/user",
  "ROLE_ROUTE" = "role/route",
  "ROUTE"      = "route",
}
