import * as _ from "lodash";

export default class ServerError extends Error {
  
  public code: number;
  public type: string;
  public item: string;
  
  private static codes: {[status: number]: {[type: string]: string}} = {
    200: {
      "any": "Request performed successfully"
    },
    400: {
      "any":       "Bad request received",
      "get":       "Could not retrieve data due to missing or errorful data.",
      "post":      "Could not create or change resource due to missing or errorful data.",
      "update":    "Could not update resource due to missing or errorful data.",
      "duplicate": "Resource already exists and no duplicates are allowed."
    },
    401: {
      "any": "Unauthorized",
      "jwt": "Could not authorize user token."
    },
    404: {
      "any": "Resource not found.",
      "get": "Could not get non-existant resource."
    },
    500: {
      "any": "Unexpected server error occurred"
    }
  };
  
  constructor(code: number, type: string, item?: any) {
    super(ServerError.codes[code][type]);
    this.code = ServerError.codes[code] ? code : 500;
    this.type = ServerError.codes[code][type] ? type : "any";
    this.message = ServerError.codes[code][type];
    this.item = item || {};
  }
  
  public static parseSQLError(error: iSQLError) {
    const cleaned = _.omit(error, "error");
    const type = error.sql.slice(0, 6).toLowerCase() === "select" ? "get" : error.sql.slice(0, 6).toLowerCase() === "insert" ? "post" : "put";
    if (error.errno === 1064) { return new ServerError(400, type, cleaned); }
    return new ServerError(500, "any", cleaned);
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