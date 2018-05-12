import * as _ from "lodash";

export default class ServerError extends Error {
  
  public code: string;
  public item: string;
  
  private static codes: { [key: string]: string } = {
    "200.any": "Request performed successfully",
    "400.get": "Malformed request received while selecting from database.",
    "400.post": "Malformed request received while inserting into database.",
    "400.duplicate": "Duplicate resource request received while inserting into database.",
    "401.any": "Unauthorized",
    "401.jwt": "Could not validate authorization token.",
    "404.get": "Resource not found while selecting from database.",
    "500.get": "Server error occured while selecting from database."
  };
  
  constructor(code: string, item?: any) {
    super(ServerError.codes[code]);
    this.code = code.match(/^[1-9][0-9]{2}\.[\w]{3,}$/) ? code : "500.any";
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