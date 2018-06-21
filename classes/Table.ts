import * as _ from "lodash";
import * as Resource from "./Resource";
import * as mysql from "mysql";
import * as DatabaseService from "../modules/DatabaseService";

export default class Table {
  
  public readonly __resource: typeof Resource.Constructor;
  public readonly __database: string;
  public readonly __columns: iTableColumns;
  public readonly __options: iTableOptions;
  
  private static __tables: {[data: string]: {[key: string]: Table}} = {};
  
  constructor(constructor: typeof Resource.Constructor, options: iTableOptions, columns: iTableColumns) {
    this.__database = (options.database instanceof DatabaseService.Pool ? options.database.id : options.database) || (options.coextensive ? "coextensive" : "master");
    
    if (_.get(Table.__tables, [this.__database, constructor.__type])) { return Table.__tables[this.__database][constructor.__type]; }
    _.set(Table.__tables, [this.__database, constructor.__type], this);
    
    this.__resource = constructor;
    this.__options = options;
    this.__columns = _.merge(options.junction ? {} : {id: {type: "binary(16)", primary_key: true, required: true, protected: true, hidden: true}}, columns);
  }
  
  public static get tables() {
    return _.clone(this.__tables);
  }
  
  public static generateTimeColumn(index?: string): iTableColumn {
    return {type: "bigint(14)", required: true, protected: true, default: null, index: index ? [index] : null};
  }
  
  public static generateUserColumn(index?: string): iTableColumn {
    return {type: "binary(16)", required: true, protected: true, default: null, index: index ? [index] : null, relations: [{table: "user", column: "id", "on_update": "CASCADE", "on_delete": "NO ACTION"}]};
  }
  
  public validationSQL(resource: Resource.Constructor) {
    const where: {[key: string]: string[]} = {};
    // TODO: Fix this segment of code by reducing complexity.
    _.each(this.__columns, (options, column) => {
      if (options.primary_key) { where.primary ? where.primary.push(column) : where.primary = [column]; }
      _.each(options.unique_index, index => where[index] ? where[index].push(column) : where[index] = [column]);
    });
    const t = _.join(_.map(where, value => `(${_.join(_.map(_.filter(value), v => mysql.format(`\`${v}\` = ?`, [resource[v]])), " AND ")})`), " OR ");
    return `SELECT * FROM \`${this.__resource.__type}\` WHERE ${t}`;
  }
  
  public insertSQL(resource: Resource.Constructor) {
    return DatabaseService.parse(`INSERT INTO \`${this.__resource.__type}\` SET ?`, _.pick(resource, _.keys(this.__columns)));
  }
  
  public updateSQL(resource: Resource.Constructor) {
    const update = _.pick(resource, _.keys(this.__columns));
    const where = _.join(_.reduce(this.__columns, (r, v, k) => v.primary_key ? r.concat(DatabaseService.parse(`${k} = ?`, resource[k])) : r, []), " AND ");
    return DatabaseService.parse(`UPDATE \`${this.__resource.__type}\` SET ? WHERE ${where}`, update);
  }
  
  public selectSQL(start?: number, limit?: number, where?: {[key: string]: any}) {
    const replacers = {
      table: this.__resource.__type,
      limit: limit || 18446744073709551615,
      start: start || 0,
      where: where ? DatabaseService.parse("WHERE ?", where) : ""
    };
    return _.template("SELECT * FROM ${table} ${where} LIMIT ${limit} OFFSET ${start}")(replacers);
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
    const object = {INDEX: {}, UNIQUE_INDEX: {}, FULLTEXT_INDEX: {}, SPATIAL_INDEX: {}};
    _.each(this.__columns, (options, column) => {
      if (options.index) { _.each(options.index, index => object["INDEX"][index] ? object["INDEX"][index].push(column) : _.set(object["INDEX"], index, [column])); }
      if (options.unique_index) { _.each(options.unique_index, index => object["UNIQUE_INDEX"][index] ? object["UNIQUE_INDEX"][index].push(column) : _.set(object["UNIQUE_INDEX"], index, [column])); }
      if (options.fulltext_index) { _.each(options.fulltext_index, index => object["FULLTEXT_INDEX"][index] ? object["FULLTEXT_INDEX"][index].push(column) : _.set(object["FULLTEXT_INDEX"], index, [column])); }
      if (options.spatial_index) { _.each(options.spatial_index, index => object["SPATIAL_INDEX"][index] ? object["SPATIAL_INDEX"][index].push(column) : _.set(object["SPATIAL_INDEX"], index, [column])); }
    });
    return _.reduce(object, (result, indexes, type) => result.concat(_.map(indexes, (columns, index) => `${_.upperCase(type)} \`${index}\` (${_.join(_.map(columns, column => `\`${column}\``))})`)), []);
  }
  
  private getRelationSQL(): string[] {
    return _.reduce(
      this.__columns,
      (result, options, col) => result.concat(_.map(Array.isArray(options.relations) ? options.relations : _.filter([options.relations]), rel =>
        _.template("CONSTRAINT `${cs}` FOREIGN KEY (`${fk}`) REFERENCES `${db}`.`${tbl}` (`${cl}`) ON UPDATE ${ou} ON DELETE ${od}")({
          cs: this.__resource.__type + ":" + col, fk: col, db: rel.database || "master", tbl: rel.table, cl: rel.column || "id", ou: rel.on_update || "NO ACTION", od: rel.on_delete || "NO ACTION"
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
  database?: string | DatabaseService.Pool;
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
  index?: string[]
  /* Which "unique" indexes should this column be part of */
  unique_index?: string[]
  /* Which "fulltext" indexes should this column be part of */
  fulltext_index?: string[]
  /* Which "spatial" indexes should this column be part of */
  spatial_index?: string[]
  /* Is this part of the primary key? */
  primary_key?: boolean
  /* Defines the foreign key relations this column has to another */
  relations?: iTableRelations | iTableRelations[]
  /* The default collation to use with the column */
  collation?: "utf8mb4_unicode_ci" | string
  /* Add a comment to the column in the database */
  comment?: string
}

export interface iTableRelations {
  database?: "master" | string
  table: string
  column?: string
  match?: "FULL" | "PARTIAL" | "SIMPLE"
  on_delete?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
  on_update?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
}