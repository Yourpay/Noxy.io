import * as _ from "lodash";

export default class Resource {
  
  public id: string;
  
  constructor(object: iObjectInitializer) {
    _.merge(this, object);
  }
  
}

interface iObjectInitializer {
  [key: string]: any
  
  id: string;
}