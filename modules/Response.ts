import * as _ from "lodash";
import * as ms from "ms";
import {tObject} from "../interfaces/iAuxiliary";
import {cResponseError, cResponseJSON, iResponseError, iResponseFn, iResponseJSON, iResponseService, tResponseCodes} from "../interfaces/iResponse";

const Service: iResponseFn = Default;

function Default(code: number, type: string, content?: iResponseError | Error | tObject<any>): iResponseError;
function Default(code: number, type: string, start: number, content: tObject<any>): iResponseJSON;
function Default(code: number, type: string, s_or_c?: number | iResponseError | Error | tObject<any>, content?: tObject<any>): iResponseError | iResponseJSON {
  return typeof s_or_c === "number" ? new ResponseJSON(code, type, s_or_c, content) : new ResponseError(code, type, s_or_c);
}

function json(code: number, type: string, start: number, content: tObject<any>): iResponseJSON {
  return new ResponseJSON(code, type, start, content);
}

function error(code: number, type: string, content: Error | Error | tObject<any>): iResponseError {
  if (content instanceof ResponseError) { return content; }
  return new ResponseError(code, type, content);
}

const ResponseJSON: cResponseJSON = class ResponseJSON implements iResponseJSON {
  
  public code: number;
  public type: string;
  public message: string;
  public content: tObject<any>;
  public time_elapsed: number;
  public time_completed: number;
  
  constructor(code: number, type: string, start: number, content: tObject<any>) {
    const now = Date.now();
    this.code = _.isNumber(code) && !_.isNaN(code) ? code : 500;
    this.type = _.isString(type) && _.trim(type).length > 0 ? type : "any";
    this.message = _.get(codes, [code, type], "No message given.");
    this.time_elapsed = ms(now - start);
    this.time_completed = now;
    this.content = content;
  }
  
};

const ResponseError: cResponseError = class ResponseError extends Error implements iResponseError {
  
  public code: number;
  public type: string;
  public log: string[];
  public message: string;
  public content: tObject<any>;
  
  constructor(code: number, type: string, content: Error | tObject<any>) {
    super();
    this.code = _.isNumber(code) && !_.isNaN(code) ? code : 500;
    this.type = _.isString(type) && _.trim(type).length > 0 ? type : "any";
    this.message = content instanceof Error ? content.message : _.get(codes, [code, type], "No message given.");
    this.log = content instanceof Error && !(content instanceof ResponseError) ? ResponseError.logFromStack(content.stack) : ResponseError.logFromStack(this.stack);
    if (content) { this.content = content; }
    delete this.stack;
  }
  
  private static logFromStack(stack: string): string[] {
    return _.map(_.tail((stack || "").split("\n")), _.trim);
  }
  
};

const codes: tResponseCodes = {
  200: {
    "any": "Request performed successfully"
  },
  400: {
    "any":          "Bad request received",
    "get":          "Could not retrieve data due to missing or errorful data.",
    "post":         "Could not create or change resource due to missing or errorful data.",
    "update":       "Could not update resource due to missing or errorful data.",
    "duplicate":    "Resource already exists and no duplicates are allowed.",
    "cache":        "No keys or value given to cache function.",
    "login":        "Incorrect username or password.",
    "promise-pipe": "Promise pipe is not in the right state to perform this action."
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
    "any":      "Resource not found.",
    "pool":     "Could not find database pool.",
    "query":    "Query yielded no results.",
    "cache":    "Could not find the value at the given key in the cache.",
    "external": "External resource could not be found."
  },
  409: {
    "cache":        "Transactional error occurred while writing to cache.",
    "promise-pipe": "Promise pipe is being resolved and cannot be modified.",
    "pool_add":     "Trying to add pool to cluster or master which already exists on pool or master.",
    "pool_update":  "Trying to update pool to cluster or master which already exists on pool or master.",
    "pool_delete":  "Trying to delete pool to cluster or master which already exists on pool or master."
  },
  500: {
    "any":          "Unexpected server error occurred",
    "cache":        "Unexpected server error occurred while attempting to read from/write to the cache.",
    "promise-pipe": "Unexpected server error occured while attempting to resolve a promise pipe.",
    "publicize":    "Unexpected server error occursed while attempting to publicize server through Application service."
  }
};

const exported: iResponseService = _.assign(
  Service,
  {
    JSON:  ResponseJSON,
    json:  json,
    Error: ResponseError,
    error: error,
    
    codes: codes
  }
);

export = exported;
