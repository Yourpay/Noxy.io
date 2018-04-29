import * as _ from "lodash";
import Element from "../classes/Element";

export default class Route extends Element {
  
  public method: string;
  public path: string;
  public flag_active: boolean;
  
  public static __type = "route";
  public static __fields = _.merge({}, Element.__fields, Element.generateTimeFields(), {
    method: {type: "enum('GET','POST','PUT','DELETE')", required: true},
    path: {type: "varchar(64)", required: true},
    flag_active: {type: "tinyint(1)", default: "0"}
  });
  public static __indexes = _.merge({}, Element.__indexes, Element.generateTimeIndexes(), {
    unique_key: {
      path: ["method", "path"]
    }
  });
  public static __relations = _.merge({}, Element.__relations);
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};
