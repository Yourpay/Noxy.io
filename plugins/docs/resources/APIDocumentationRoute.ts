import {tNonFnPropsOptional} from "../../../interfaces/iAuxiliary";
import {eResourceType} from "../../../interfaces/iResource";
import * as Resource from "../../../modules/Resource";
import Route from "../../../resources/Route";
import {eAPIDocumentationType} from "../init";
import APIDocumentation from "./APIDocumentation";

const definition = {
  documentation_id: Resource.Table.toReferenceColumn<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION),
  route_id:         Resource.Table.toReferenceColumn<eResourceType>(eResourceType.ROUTE),
  description:      {type: "text", default: ""},
  time_created:     Resource.Table.toTimeColumn("time_created"),
  time_updated:     Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class APIDocumentationRoute extends Resource.Constructor {
  
  public documentation_id: string | Buffer | APIDocumentation;
  public route_id: string | Buffer | Route;
  public description: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(initializer: tNonFnPropsOptional<APIDocumentationRoute> = {}) {
    super(initializer);
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
    if (initializer.documentation_id) {
      if (typeof initializer.documentation_id === "string") { this.documentation_id = Resource.bufferFromUUID(initializer.documentation_id); }
      else if (initializer.documentation_id instanceof Buffer) { this.documentation_id = initializer.documentation_id; }
      else {
        this.documentation_id = initializer.documentation_id.id;
      }
    }
    if (initializer.route_id) {
      if (typeof initializer.route_id === "string") { this.route_id = Resource.bufferFromUUID(initializer.route_id); }
      else if (initializer.route_id instanceof Buffer) { this.route_id = initializer.route_id; }
      else {
        this.route_id = initializer.route_id.id;
      }
    }
  }
  
}

Resource<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_ROUTE, APIDocumentationRoute, definition, options);
