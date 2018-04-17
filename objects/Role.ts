import * as _ from "lodash";
import BaseObject from "../classes/BaseObject";

export default class Role extends BaseObject {
  
  public name: string;
  public key: string;
  
  public static __type = "role";
  public static __fields = _.merge({}, BaseObject.__fields, BaseObject.generateTimeFields(), BaseObject.generateUserFields(), {
    name: {type: "varchar(32)", required: true, onInsert: $this => _.get(_.set($this, "key", _.deburr($this.name.toLowerCase().replace(/\s|\W/g, ""))), "key"), onUpdate: $this => $this.__fields.name.onInsert($this)},
    key: {type: "varchar(32)", required: true, protected: true}
  });
  public static __indexes = _.merge({}, BaseObject.__indexes, BaseObject.generateTimeIndexes(), BaseObject.generateUserIndexes(), {
    unique_key: {
      name: ["name"],
      key: ["key"]
    }
  });
  public static __relations = _.merge({}, BaseObject.__relations, BaseObject.generateUserConstraints());
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};
