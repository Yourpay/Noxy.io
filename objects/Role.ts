import * as _ from "lodash";
import BaseObject from "../classes/BaseObject";

export default class Role extends BaseObject {
  
  protected readonly __type;
  protected readonly __fields;
  protected readonly __validated;
  protected readonly __indexes;
  protected readonly __primary;
  
  public static __type = "role";
  public static __fields = _.merge({}, BaseObject.__fields, {
    name: {type: "varchar(32)", required: true, onInsert: (t, v) => t.key = v.replace(/\s|\W/g, ""), onUpdate: (t, v) => t.key = v.replace(/\s|\W/g, "")},
    key: {type: "varchar(32)", required: true, protected: true}
  }, BaseObject.generateTimeFields(), BaseObject.generateUserFields());
  public static __indexes = _.merge({}, BaseObject.__indexes, {key: {key: ["key"]}}, BaseObject.generateTimeIndexes(), BaseObject.generateUserIndexes());
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};

