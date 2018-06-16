import * as _ from "lodash";
import Element from "../classes/Element";

export default class RoleUser extends Element {
  
  public role_id: Buffer;
  public user_id: Buffer;
  
  public static __type = "role_user";
  
  public static __fields = _.assign({},
    Element.__fields,
    {
      role_id: {type: "binary(16)", required: true},
      user_id: {type: "binary(16)", required: true}
    }
  );
  
  public static __indexes = _.assign({},
    Element.__indexes,
    {
      unique_key: {
        junction: ["role_id", "user_id"]
      }
    }
  );
  
  public static __relations = _.assign({},
    Element.__relations,
    {
      role_id: {table: "role", on_delete: "NO ACTION", on_update: "CASCADE"},
      user_id: {table: "user", on_delete: "NO ACTION", on_update: "CASCADE"}
    }
  );
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};