import * as _ from "lodash";
import * as Resource from "./Resource";
import * as mysql from "mysql";

export class Table {
  
  public readonly __name: string;
  public readonly __columns: iTableColumns;
  public readonly __options: iTableOptions;
  
  constructor(name: string, options: iTableOptions, columns: iTableColumns) {
    this.__name = name;
    this.__options = options;
    this.__columns = _.merge(options.junction ? {} : {id: {type: "binary(16)", primary_key: true, required: true, protected: true}}, columns);
  }
  
  public static generateTimeColumn(index?: boolean): iTableColumn {
    return {type: "bigint(14)", required: true, protected: true};
  }
  
  public validationSQL(resource: Resource.Constructor) {
    const where: {[key: string]: string[]} = {};
    _.each(this.__columns, (options, column) => {
      if (options.primary_key) { where.primary ? where.primary.push(column) : where.primary = [column]; }
      _.each(options.unique_index, index => where[index] ? where[index].push(column) : where[index] = [column]);
    });
    const t = _.join(_.map(where, value => `(${_.join(_.map(_.filter(value), v => mysql.format(`${v} = ?`, [resource[v]])), " AND ")})`), " OR ");
    return `SELECT * FROM \`${this.__name}\` WHERE ${t}`;
  }
  
  public toSQL(): string {
    return `${this.getTableSQL()} (${this.getTableDefinitionSQL()}) ${this.getTableOptionsSQL()};`;
  }
  
  private getTableSQL(): string {
    return "CREATE TABLE IF NOT EXISTS `?`".replace("?", this.__name);
  }
  
  private getTableDefinitionSQL() {
    return _.trimEnd(_.join(this.getColumnSQL(), ", ") + ", " + _.join(this.getIndexSQL(), ", ") + ", " + _.join(this.getRelationSQL(), ", "), ", ");
  }
  
  private getColumnSQL(): string[] {
    return _.map(this.__columns, (options, column) => _.join(_.filter([
      "`" + column + "`",
      _.toUpper(options.type),
      options.null && !options.primary_key ? "NULL" : "NOT NULL",
      options.default || (options.null && !options.primary_key) ? `DEFAULT ${options.default || "NULL"}` : "",
      options.collation && options.type.match(/(?:text|char)/gi) ? `COLLATE ${options.collation}` : "",
      options.comment
    ]), " "));
  }
  
  private getPrimaryKeySQL(): string[] {
    return _.reduce(this.__columns, (result, options, column) => {
      return options.primary_key ? result.concat(column) : result;
    }, []);
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
      (result, options, col) => result.concat(_.map(options.relations, rel =>
        `CONSTRAINT \`${this.__name}:${col}\` FOREIGN KEY (\`${col}\`) REFERENCES \`${rel.table}\` (\`${rel.column}\`) ON UPDATE ${rel.on_update || "NO ACTION"} ON DELETE ${rel.on_delete || "NO ACTION"}`)
      ),
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
  default?: string
  /* Must the field contain a value */
  required?: boolean
  /* Should the value be modifiable from outside the server */
  protected?: boolean
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
  relations?: iTableRelations[]
  /* The default collation to use with the column */
  collation?: "utf8mb4_unicode_ci" | string
  /* Add a comment to the column in the database */
  comment?: string
}

export interface iTableRelations {
  table: string
  column: string
  match?: "FULL" | "PARTIAL" | "SIMPLE"
  on_delete?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
  on_update?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT"
}