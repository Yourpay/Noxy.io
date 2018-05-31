import * as _ from "lodash";
import Element from "../classes/Element";
import {env} from "../app";

export default class RoleRoute extends Element {
  
  public role_id: Buffer;
  public route_id: Buffer;
  
  public static __type = env.tables.default.names.role_route;
  public static __fields = _.merge({}, Element.__fields, {
    role_id:  {type: "binary(16)", required: true, protected: true},
    route_id: {type: "binary(16)", required: true, protected: true}
  });
  public static __indexes = _.merge({}, Element.__indexes, {unique_key: {junction: ["role_id", "route_id"]}});
  public static __relations = _.merge({}, Element.__relations, {
    role_id:  {table: env.tables.default.names.role, on_delete: "NO ACTION", on_update: "CASCADE"},
    route_id: {table: env.tables.default.names.route, on_delete: "NO ACTION", on_update: "CASCADE"}
  });
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};