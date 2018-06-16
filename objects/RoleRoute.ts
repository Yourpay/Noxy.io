import * as _ from "lodash";
import Element from "../classes/Element";

export default class RoleRoute extends Element {
  
  public role_id: Buffer;
  public route_id: Buffer;
  
  public static __type = "role_route";
  
  public static __fields = _.assign({},
    Element.__fields,
    {
      role_id:  {type: "binary(16)", required: true, protected: true},
      route_id: {type: "binary(16)", required: true, protected: true}
    }
  );
  
  public static __indexes = _.assign({},
    Element.__indexes,
    {
      unique_key: {
        junction: ["role_id", "route_id"]
      }
    }
  );
  
  public static __relations = _.assign({},
    Element.__relations,
    {
      role_id:  {table: "role", on_delete: "NO ACTION", on_update: "CASCADE"},
      route_id: {table: "route", on_delete: "NO ACTION", on_update: "CASCADE"}
    }
  );
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};