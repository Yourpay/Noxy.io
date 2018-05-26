import * as _ from "lodash";
import Element from "../../classes/Element";
import User from "../../objects/User";
import {documentation_types} from "./init";

export default class DocsField extends Element {
  
  public static __type = documentation_types.endpoint_field;
  public static __fields = _.assign(
    {
      name: {type: "varchar(32)", required: true, protected: true}
    },
    Element.__fields,
    Element.generateTimeFields(),
    Element.generateUserFields()
  );
  public static __indexes = _.assign(
    {
      unique_key: {
        name: ["name"],
        key:  ["key"]
      }
    },
    Element.generateTimeIndexes(),
    Element.generateUserIndexes());
  public static __relations = _.assign(
    {},
    Element.generateUserRelations()
  );
  public name: string;
  public user_created: User;
  public time_created: number;
  public time_updated: number;
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};