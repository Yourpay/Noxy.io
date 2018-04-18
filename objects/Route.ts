import * as _ from "lodash";
import BaseObject from "../classes/BaseObject";

export default class Route extends BaseObject {
  
  public method: string;
  public url: string;
  
  public static __type = "route";
  public static __fields = _.merge({}, BaseObject.__fields, BaseObject.generateTimeFields(), BaseObject.generateUserFields(), {
    method: {type: "enum('GET','POST','PUT','DELETE')", required: true},
    url: {type: "varchar(64)", required: true}
  });
  public static __indexes = _.merge({}, BaseObject.__indexes, BaseObject.generateTimeIndexes(), BaseObject.generateUserIndexes(), {
    unique_key: {
      path: ["method", "url"],
    }
  });
  public static __relations = _.merge({}, BaseObject.__relations, BaseObject.generateUserConstraints());
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};
