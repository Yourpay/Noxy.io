import Element from "../classes/Element";
import User from "./User";
import * as _ from "lodash";

export default class Role extends Element {
  
  public name: string;
  public key: string;
  public user_created: User;
  public time_created: boolean;
  public time_updated: boolean;
  
  public static __type = "role";
  
  public static __fields = _.assign({},
    Element.__fields,
    {
      name: {type: "varchar(32)", required: true},
      key:  {type: "varchar(32)", required: true, protected: true, onCreate: $this => Element.stringToKey($this.name)}
    },
    Element.generateTimeFields(),
    Element.generateUserFields()
  );
  
  public static __indexes = _.assign({},
    Element.__indexes,
    {
      unique_key: {
        name: ["name"],
        key:  ["key"]
      }
    },
    Element.generateTimeIndexes(),
    Element.generateUserIndexes());
  
  public static __relations = _.assign({},
    Element.__relations,
    Element.generateUserRelations()
  );
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};
