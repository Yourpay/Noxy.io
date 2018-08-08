import * as _ from "lodash";

export default class Resource {
  
  public id: string;
  
  constructor(object: iObjectInitializer) {
    _.merge(this, object);
  }
  
}

interface iObjectInitializer {
  id: string;
  
  [key: string]: any
}