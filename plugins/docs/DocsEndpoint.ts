import * as _ from "lodash";
import Element, {iObjectRelationSet} from "../../classes/Element";
import Route from "../../objects/Route";
import {documentation_types} from "./init";
import * as env from "../../env.json";

export default class APIEndpoint extends Element {
  
  public static __type = documentation_types.endpoint;
  public static __fields = _.assign({},
    Element.__fields,
    {
      route: {type: "varchar(32)", required: true, protected: true}
    }
  );
  public static __indexes = _.assign(
    {
      unique_key: {
        name: ["name"],
        key:  ["key"]
      }
    }
  );
  public static __relations = <iObjectRelationSet>{
    route_id: {table: env.tables.default.names.route, on_delete: "NO ACTION", on_update: "CASCADE"}
  };
  public route: Route;
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};

// public static __type = env.tables.default.names.role_user;
// public static __fields = _.merge({}, Element.__fields, {
//   role_id: {type: "binary(16)", required: true},
//   user_id: {type: "binary(16)", required: true}
// });
// public static __indexes = _.merge({}, Element.__indexes, {unique_key: {junction: ["role_id", "user_id"]}});
// public static __relations = _.merge({}, Element.__relations, {
//   role_id: {table: env.tables.default.names.role, on_delete: "NO ACTION", on_update: "CASCADE"},
//   user_id: {table: env.tables.default.names.user, on_delete: "NO ACTION", on_update: "CASCADE"}
// });
