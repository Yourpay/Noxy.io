import * as _ from "lodash";
import * as ms from "ms";
import {iResponseErrorObject, iResponseFn, iResponseJSONObject, iResponseService, tResponseCodes, tResponseContent} from "../interfaces/iResponse";

const Service: iResponseFn = Default;

function Default(code: number, type: string, content: tResponseContent | iResponseErrorObject = null, start?: number): iResponseErrorObject | iResponseJSONObject {
  return content instanceof Error && !start ? error(code, type, content) : json(code, type, content, start);
}

function json(code: number, type: string, content?: tResponseContent, start?: number): iResponseJSONObject {
  const now = Date.now();
  const object: iResponseJSONObject = {
    code:           _.isNumber(code) && !_.isNaN(code) ? code : 500,
    type:           type || "any",
    message:        _.get(codes, [code || 500, type || "any"], "No message given."),
    time_completed: now
  };
  if (start) { object.time_elapsed = ms(now - start); }
  if (!_.isUndefined(content)) { object.content = content; }
  return object;
}

function error(code: number, type: string, content: tResponseContent | iResponseErrorObject | Error): iResponseErrorObject {
  const error_object = content instanceof Error ? content : Error.prototype.constructor();
  const stack = error_object.log || error_object.stack;
  const object = _.assign(error_object, {
    code:    (<tResponseContent>error_object).code || _.isNumber(code) && !_.isNaN(code) ? code : 500,
    type:    (<tResponseContent>error_object).type || _.isString(type) && _.trim(type).length > 0 ? type : "any",
    message: error_object.message || _.get(codes, [code || 500, type || "any"], "No message given."),
    log:     _.isString(stack) ? parseErrorStack(stack) : stack
  });
  if (content !== error_object && !_.isUndefined(content)) { object.content = content; }
  delete object.stack;
  return object;
}

function isError(err: iResponseErrorObject): boolean {
  return !!(err instanceof Error && err.code && err.type && err.message && err.log);
}

function parseErrorStack(stack): string[] {
  return _.map(_.tail((stack || "").split("\n")), _.trim);
}

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
    codes:   codes,
    json:    json,
    error:   error,
    isError: isError
  }
);

export = exported;
