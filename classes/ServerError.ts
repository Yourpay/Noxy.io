export default class ServerError extends Error {
  
  public code: string;
  public item: string;
  
  private static codes: { [key: string]: string } = {
    "400.db.select": "Resource not found while selecting from database.",
    "500.db.select": "Server occured while selecting from database."
  };
  
  constructor(code: string, item?: any) {
    super(ServerError.codes[code]);
    this.code = code.match(/^[1-9][0-9]{2}\.[-a-z]{2,}\.[0-9a-z]+$/) ? code : "500.server.0";
    this.item = item;
  }
  
}
