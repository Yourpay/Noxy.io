import {eApplicationMethods, tApplicationMiddleware} from "../interfaces/iApplication";
import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";

const definition: iTableDefinition = {
  subdomain:    {type: "varchar", length: 64, protected: true, required: true, unique_index: "route"},
  path:         {type: "varchar", length: 64, protected: true, required: true, unique_index: "route"},
  namespace:    {type: "varchar", length: 64, protected: true, required: true, unique_index: "route"},
  method:       {type: "enum", values: ["GET", "POST", "PUT", "DELETE", "PATCH"], protected: true, required: true, unique_index: "route"},
  flag_active:  {type: "tinyint", length: 1, default: "0"},
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class Route extends Resource.Constructor {
  
  public path: string;
  public method: eApplicationMethods;
  public subdomain: string;
  public namespace: string;
  public flag_active: boolean;
  public time_created: number;
  public time_updated: number;
  
  public url: string;
  public key: string;
  public weight: number;
  public middleware: tApplicationMiddleware[];
  
  constructor(initializer: tNonFnPropsOptional<Route> = {}) {
    super(initializer);
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
  }
  
}

Resource<eResourceType>(eResourceType.ROUTE, Route, definition, options);
