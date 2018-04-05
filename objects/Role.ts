import * as _ from "lodash";
import BaseObject from "../classes/BaseObject";

export default class Role extends BaseObject {
  
  protected readonly __fields;
  protected readonly __validated;
  
  public static __type = "role";
  public static __fields = _.assign({}, BaseObject.__fields, {
    name: {type: "varchar(32)", required: true, onInsert: (t, v) => t.key = v.replace(/\s|\W/g, ""), onUpdate: (t, v) => t.key = v.replace(/\s|\W/g, "")},
    key: {type: "varchar(32)", required: true, protected: true}
  }, BaseObject.generateTimeFields(), BaseObject.generateUserFields());
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};
