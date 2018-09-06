import * as Promise from "bluebird";
import {tEnum} from "./iAuxiliary";

export interface iResource {
  <T, R extends cResourceConstructor>(type: tEnum<T> & string, constructor: R, definition: iTableDefinition, options?: iTableOptions): R
  
  Table: cTable
  Constructor: cResourceConstructor
  
  TYPES: typeof eResourceType
}

export interface cResourceConstructor {
  new(initializer?: Object): iResourceConstructor
  
  table: iTable
  type: string
}

export interface iResourceConstructor {
  id: Buffer
  uuid: string
  validated: boolean;
  exists: boolean;
  
  validate: (options?: iResourceActionOptions) => Promise<iResourceConstructor>
  save: (options?: iResourceActionOptions) => Promise<iResourceConstructor>
}

export interface iResourceActionOptions {
  update_protected?: boolean
  timeout?: number
  keys?: string[]
  collision_fallback?: boolean | (() => Promise<any>)
}

export interface cTable {
  new(): iTable
  
  toRelationColumn: <T>(table: tEnum<T> & string, hidden?: boolean) => iTableColumn
  toTimeColumn: (index?: string, hidden?: boolean) => iTableColumn
}

export interface iTable {
  readonly resource: cResourceConstructor;
  readonly definition: iTableDefinition;
  readonly options: iTableOptions;
  readonly keys: string[][];
  
  validate: (resource: iResourceConstructor, options?: iResourceActionOptions) => Promise<iResourceConstructor>
  save: (resource: iResourceConstructor, options?: iResourceActionOptions) => Promise<iResourceConstructor>
  toSQL(): () => string
}

export interface iTableOptions {
  /* Is this table coextensive? Can it exist in multiple databases? */
  coextensive?: boolean
  /* The database that this table should be assigned to if it is not coextensive */
  database?: string;
  /* Is the table a junction table? If it is, the ID column will not be added automatically. */
  junction?: boolean
  /* The default collation to use with the table */
  collation?: "utf8mb4_unicode_ci" | string
  /* The database engine to run the table under */
  engine?: "InnoDB" | "MyISAM" | "Aria" | "CSV" | string
  
  temporary?: boolean
  exists_check?: boolean
}

export interface iTableDefinition {
  [key: string]: iTableColumn
}

export interface iTableColumn {
  /* The MySQL denoted type */
  type: string
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
  
  auto_increment?: boolean,
  
  column_format?: "FIXED" | "DYNAMIC" | "DEFAULT"
}

export interface iReferenceDefinition {
  database?: string
  table: string
  column?: string
  match?: "FULL" | "PARTIAL" | "SIMPLE"
  on_delete?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
  on_update?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
}

export enum eResourceType {
  "USER"       = "user",
  "ROLE"       = "role",
  "ROLE_USER"  = "role/user",
  "ROLE_ROUTE" = "role/route",
  "ROUTE"      = "route",
  "TEST"       = "test",
}
