import * as _ from "lodash";
import {env} from "../app";
import * as Database from "../modules/Database";
import * as Resource from "./Resource";

export default class Table {
  
  private static __tables: {[data: string]: {[key: string]: Table}} = {};
  public readonly __resource: typeof Resource.Constructor;
  public readonly __database: string;
  public readonly __columns: iTableColumns;
  public readonly __options: iTableOptions;
  
  constructor(constructor: typeof Resource.Constructor, options: iTableOptions, columns: iTableColumns) {
    this.__database = (options.database instanceof Database.Pool ? options.database.id : options.database) || env.mode;
    
    if (_.get(Table.__tables, [this.__database, constructor.__type])) { throw new Error("Trying to overwrite already existing table."); }
    _.set(Table.__tables, [this.__database, constructor.__type], this);
    
    this.__resource = constructor;
    this.__options = options;
    this.__columns = _.merge(options.junction ? {} : {id: {type: "binary(16)", primary_key: true, required: true, protected: true}}, columns);
  }
  
  public static get tables() {
    return _.clone(this.__tables);
  }
  
  public static generateTimeColumn(index?: string, hidden: boolean = false): iTableColumn {
    return {
      type:      "bigint(13)",
      required:  true,
      protected: true,
      default:   null,
      index:     index ? [index] : null,
      hidden:    hidden
    };
  }
  
  public static generateUserColumn(index?: string, hidden: boolean = false): iTableColumn {
    return {
      type:      "binary(16)",
      required:  true,
      protected: true,
      default:   null,
      index:     index ? [index] : null,
      relation:  {table: "user", column: "id", "on_update": "CASCADE", "on_delete": "CASCADE"},
      hidden:    hidden
    };
  }
  
  public getUniqueKeys(): {[key: string]: string[]} {
    return _.reduce(this.__columns, (result, col, key) => !col.unique_index ? result : _.reduce(_.concat(col.unique_index), (set, i) => _.set(set, i, _.concat(key, _.get(set, i, []))), result), {});
  }
  
  public getPrimaryKeys(): string[] {
    return _.reduce(this.__columns, (result, col, key) => !col.primary_key ? result : _.concat(key, result), []);
  }
  
  public validationSQL(resource: Resource.Constructor) {
    const keys  = _.filter(_.concat([_.values(this.getPrimaryKeys())], _.values(this.getUniqueKeys())), v => v.length > 0),
          where = _.join(_.map(keys, index => _.join(_.map(index, v => Database.parse("?? = ?", [v, resource[v]])), " AND ")), " OR ");
    return Database.parse(`SELECT * FROM ?? WHERE ${where}`, this.__resource.__type);
  }
  
  public insertSQL(resource: Resource.Constructor) {
    return Database.parse(`INSERT INTO ?? SET ?`, [this.__resource.__type, _.pick(resource, _.keys(this.__columns))]);
  }
  
  public updateSQL(resource: Resource.Constructor) {
    const where = _.join(_.reduce(this.__columns, (r, v, k) => v.primary_key ? r.concat(Database.parse(`\`${k}\` = ?`, resource[k])) : r, []), " AND ");
    return Database.parse(`UPDATE ?? SET ? WHERE ${where}`, [this.__resource.__type, _.pick(resource, _.keys(this.__columns))]);
  }
  
  public countSQL(where?: string | {[key: string]: any}) {
    const replacers = {
      table: this.__resource.__type,
      where: where ? "WHERE " + (_.isString(where) ? where : _.join(_.map(where, (v, k) => Database.parse("?? = ?", [k, v])), "AND")) : ""
    };
    return _.template("SELECT COUNT(1) as `count` FROM `${table}` ${where}")(replacers);
  }
  
  public selectSQL(start?: number, limit?: number, where?: {[key: string]: any}) {
    const replacers = {
      table: this.__resource.__type,
      limit: limit || 18446744073709551615,
      start: start || 0,
      where: where ? "WHERE " + (_.isString(where) ? where : _.join(_.map(where, (v, k) => Database.parse("?? = ?", [k, v])), "AND")) : ""
    };
    return _.template("SELECT * FROM `${table}` ${where} LIMIT ${limit} OFFSET ${start}")(replacers);
  }
  
  public toSQL(): string {
    return `${this.getTableSQL()} (${this.getTableDefinitionSQL()}) ${this.getTableOptionsSQL()};`;
  }
  
  private getTableSQL(): string {
    return "CREATE TABLE IF NOT EXISTS `?`".replace("?", this.__resource.__type);
  }
  
  private getTableDefinitionSQL() {
    return _.join(_.filter([
      _.join(this.getColumnSQL(), ", "),
      this.getPrimaryKeySQL(),
      _.join(this.getIndexSQL(), ", "),
      _.join(this.getRelationSQL(), ", ")
    ]), ", ");
  }
  
  private getColumnSQL(): string[] {
    return _.map(this.__columns, (options, column) => _.join(_.filter([
      "`" + column + "`",
      _.toUpper(options.type),
      options.null && !options.primary_key || options.default === null ? "NULL" : "NOT NULL",
      options.null && !options.primary_key || options.default ? `DEFAULT ${options.default || "NULL"}` : "",
      options.collation && options.type.match(/(?:text|char)/gi) ? `COLLATE ${options.collation}` : "",
      options.comment
    ]), " "));
  }
  
  private getPrimaryKeySQL(): string {
    return "PRIMARY KEY (" + _.reduce(this.__columns, (result, options, column) => options.primary_key ? result.concat("`" + column + "`") : result, []) + ")";
  }
  
  private getIndexSQL(): string[] {
    const object = {};
    _.each(this.__columns, (options, column) => {
      _.each(_.concat(options.index || []), index => _.set(object, ["INDEX", index], _.concat(column, _.get(object, ["INDEX", index], []))));
      _.each(_.concat(options.unique_index || []), index => _.set(object, ["UNIQUE_INDEX", index], _.concat(column, _.get(object, ["UNIQUE_INDEX", index], []))));
      _.each(_.concat(options.fulltext_index || []), index => _.set(object, ["FULLTEXT_INDEX", index], _.concat(column, _.get(object, ["FULLTEXT_INDEX", index], []))));
      _.each(_.concat(options.spatial_index || []), index => _.set(object, ["SPATIAL_INDEX", index], _.concat(column, _.get(object, ["SPATIAL_INDEX", index], []))));
    });
    return _.reduce(object, (result, indexes, type) => result.concat(_.map(indexes, (columns, index) => `${_.upperCase(type)} \`${index}\` (${_.join(_.map(columns, column => `\`${column}\``))})`)), []);
  }
  
  private getRelationSQL(): string[] {
    return _.reduce(
      this.__columns,
      (result, options, col) => result.concat(_.map(_.filter(_.concat(options.relation)), rel =>
        _.template("CONSTRAINT `${cs}` FOREIGN KEY (`${fk}`) REFERENCES `${db}`.`${tbl}` (`${cl}`) ON UPDATE ${ou} ON DELETE ${od}")({
          cs:  this.__resource.__type + ":" + col,
          fk:  col,
          db:  _.get(rel, "database", "master"),
          tbl: _.get(rel, "table", rel),
          cl:  _.get(rel, "column", "id"),
          ou:  _.get(rel, "on_update", "CASCADE"),
          od:  _.get(rel, "on_delete", "CASCADE")
        })
      )),
      []
    );
  }
  
  private getTableOptionsSQL(): string {
    return _.join(_.filter([
      `ENGINE=${this.__options.engine ? this.__options.engine : "InnoDB"}`,
      `COLLATE='${this.__options.collation ? this.__options.collation : "utf8mb4_unicode_ci"}'`
    ]), " ");
  }
  
}

export interface iTableOptions {
  /* Is this table coextensive? Can it exist in multiple databases? */
  coextensive?: boolean
  /* The database that this table should be assigned to if it is not coextensive */
  database?: string | Database.Pool;
  /* Is the table a junction table? If it is, the ID column will not be added automatically. */
  junction?: boolean
  /* The default collation to use with the table */
  collation?: "utf8mb4_unicode_ci" | string
  /* The database engine to run the table under */
  engine?: "InnoDB" | "MyISAM" | "Aria" | "CSV" | string
}

export interface iTableColumns {
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
  relation?: string | iTableRelation
  /* The default collation to use with the column */
  collation?: "utf8mb4_unicode_ci" | string
  /* Add a comment to the column in the database */
  comment?: string
}

export interface iTableRelation {
  database?: "master" | string
  table: string
  column?: string
  match?: "FULL" | "PARTIAL" | "SIMPLE"
  on_delete?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
  on_update?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
}