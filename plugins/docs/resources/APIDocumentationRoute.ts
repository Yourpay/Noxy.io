import {tNonFnPropsOptional} from "../../../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../../../interfaces/iResource";
import * as Resource from "../../../modules/Resource";
import Route from "../../../resources/Route";
import {eAPIDocumentationType} from "../init";
import APIDocumentation from "./APIDocumentation";

const definition: iTableDefinition = {
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
  }
  
}

Resource<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_ROUTE, APIDocumentationRoute, definition, options);
