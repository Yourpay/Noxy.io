import ms = require("ms");
import * as _ from "lodash";

export const codes: {[status: number]: {[type: string]: string}} = {
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
  403: {
    "any": "Forbiddden.",
    "get": "Could not get non-existant resource."
  },
  404: {
    "any": "Resource not found.",
    "get": "Could not get non-existant resource.",
    "pool": "Could not get database pool."
  },
  409: {
    "cache": "Transactional error occurred while writing to cache.",
    "pool_add": "Trying to add pool to cluster or master which already exists on pool or master.",
    "pool_update": "Trying to update pool to cluster or master which already exists on pool or master.",
    "pool_delete": "Trying to delete pool to cluster or master which already exists on pool or master."
  },
  500: {
    "any":   "Unexpected server error occurred",
    "cache": "Unexpected server error occurred while attempting to read from/write to the cache."
  }
};

export function parseError(err) {
  return _.isError(err) ? {message: err.message, stack: _.map(_.tail(err.stack.split("\n")), _.trim)} : err;
}

export class error extends Error {
  public code: number;
  public type: string;
  public message: string;
  public content: any;
  
  constructor(code: number, type: string, content?: any) {
    super(_.get(codes, [code, type], "Unknown error message"));
    this.code = codes[code] ? code : 500;
    this.type = codes[code][type] ? type : "any";
    this.content = content || {};
  }
  
}

export class json {
  
  public code: number;
  public type: string;
  public message: string;
  public content: any;
  public time_finished: number;
  public time_elapsed: string;
  
  constructor(code: number, type: string, content?: any, start?: number) {
    this.code = codes[code] ? code : 500;
    this.type = codes[code][type] ? type : "any";
    this.message = codes[code][type];
    this.time_finished = Date.now();
    if (start) {
      this.time_elapsed = ms(this.time_finished - start);
    }
    if (content) {
      this.content = _.isPlainObject(content) || Array.isArray(content) ? json.parseKeys(content) : content;
    }
  }
  
  private static parseKeys(content) {
    return _.transform(content, (r, v, k) => _.set(r, `${k}`.replace(/\//g, "__"), _.isPlainObject(v) || Array.isArray(v) ? json.parseKeys(v) : v), <any>(Array.isArray(content) ? [] : {}));
  }
  
}
