import * as _ from "lodash";
import Element from "../classes/Element";
import User from "./User";

export default class Role extends Element {
  
  public name: string;
  public key: string;
  public user_created: User;
  public time_created: boolean;
  public time_updated: boolean;
  
  public static __type = "role";
  public static __fields = _.merge({}, Element.__fields, Element.generateTimeFields(), Element.generateUserFields(), {
    name: {type: "varchar(32)", required: true, onInsert: $this => _.get(_.set($this, "key", _.deburr($this.name.toLowerCase().replace(/\s|\W/g, ""))), "key"), onUpdate: $this => $this.__fields.name.onInsert($this)},
    key: {type: "varchar(32)", required: true, protected: true}
  });
  public static __indexes = _.merge({}, Element.__indexes, Element.generateTimeIndexes(), Element.generateUserIndexes(), {
    unique_key: {
      name: ["name"],
      key: ["key"]
    }
  });
  public static __relations = _.merge({}, Element.__relations, Element.generateUserRelations());
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};
