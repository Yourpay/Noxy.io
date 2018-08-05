import Resource from "./Resource";

export default class ResourceCollection {
  
  public key: string;
  public fields: string[];
  public objects: {[key: string]: Resource};
  public current: Resource[];
  
  constructor(key: string, fields?: string[]) {
    this.key = key;
    this.fields = fields;
    this.objects = {};
    this.current = [];
  }
  
}
