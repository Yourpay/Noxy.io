import ms = require("ms");

const codes: {[status: number]: {[type: string]: string}} = {
  200: {
    "any": "Request performed successfully"
  },
  400: {
    "any":            "Bad request received",
    "get":            "Could not retrieve data due to missing or errorful data.",
    "post":           "Could not create or change resource due to missing or errorful data.",
    "update":         "Could not update resource due to missing or errorful data.",
    "duplicate":      "Resource already exists and no duplicates are allowed.",
    "merchant_token": "Could not validate merchant token."
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

export class JSON {
  
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
      this.content = content;
    }
    
  }
  
}