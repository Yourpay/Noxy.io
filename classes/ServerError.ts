import * as _ from "lodash";

export default class ServerError extends Error {
  
  public code: string;
  public item: string;
  
  private static codes: { [key: string]: string } = {
    "200.server.any": "Request performed successfully",
    "400.db.select": "Malformed request received while selecting from database.",
    "400.db.insert": "Malformed request received while inserting into database.",
    "400.db.duplicate": "Duplicate resource request received while inserting into database.",
    "404.db.select": "Resource not found while selecting from database.",
    "500.db.select": "Server error occured while selecting from database."
  };
  
  constructor(code: string, item?: any) {
    super(ServerError.codes[code]);
    this.code = code.match(/^[1-9][0-9]{2}\.[-a-z]{2,}\.[0-9a-z]+$/) ? code : "500.server.unknown";
    this.item = item || {};
  }
  
  public static parseSQLError(error: iSQLError) {
    const cleaned = _.omit(error, "error");
    const type = error.sql.slice(0, 6).toLowerCase() === "select" ? "select" : error.sql.slice(0, 6).toLowerCase() === "insert" ? "insert" : "update";
    if (error.errno === 1064) { return new ServerError(`400.db.${type}`, cleaned); }
    return new ServerError(`500.db.unknown`, cleaned);
  }
  
}

interface iSQLError {
  code: string,
  errno: number,
  sqlMessage: string,
  sqlState: string,
  index: number,
  sql: string
}