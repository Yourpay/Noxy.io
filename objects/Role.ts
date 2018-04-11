import * as _ from "lodash";
import BaseObject from "../classes/BaseObject";

export default class Role extends BaseObject {
  
  public name: string;
  public key: string;
  
  public static __type = "role";
  public static __fields = _.merge({}, BaseObject.__fields, {
    name: {type: "varchar(32)", required: true, onInsert: $this => !($this.key = $this.name.replace(/\s|\W/g, "")) || $this.name, onUpdate: $this => $this.__fields.name.onInsert($this)},
    key: {type: "varchar(32)", required: true, protected: true}
  }, BaseObject.generateTimeFields(), BaseObject.generateUserFields());
  public static __indexes = _.merge({}, BaseObject.__indexes, {key: {key: ["key"]}}, BaseObject.generateTimeIndexes(), BaseObject.generateUserIndexes());
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};

