import * as _ from "lodash";
import Element from "../../classes/Element";
import User from "../../objects/User";

export default class APIElement extends Element {
  
  public name: string;
  public user_created: User;
  public time_created: boolean;
  public time_updated: boolean;
  
  public static __type = "element";
  
  public static __fields = _.merge({}, Element.__fields, Element.generateTimeFields(), Element.generateUserFields(), {
    name: {type: "varchar(32)", required: true, protected: true},
  });
  
  public static __indexes = _.merge({}, Element.__indexes, Element.generateTimeIndexes(), Element.generateUserIndexes(), {unique_key: {name: ["name"], key: ["key"]}});
  public static __relations = _.merge({}, Element.__relations, Element.generateUserRelations());
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};