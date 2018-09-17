import * as _ from "lodash";
import {tNonFnPropsOptional} from "../../../interfaces/iAuxiliary";
import {iTableOptions} from "../../../interfaces/iResource";
import * as Resource from "../../../modules/Resource";
import {eAPIDocumentationType} from "../init";
import APIDocumentationParameter from "./APIDocumentationParameter";
import APIDocumentationRoute from "./APIDocumentationRoute";

const definition = {
  documentation_route_id:     Resource.Table.toReferenceColumn<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_ROUTE),
  documentation_parameter_id: Resource.Table.toReferenceColumn<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_PARAMETER)
};
const options: iTableOptions = {resource: {junction: true}};

export default class APIDocumentationRouteParameter extends Resource.Constructor {
  
  public documentation_route_id: string | Buffer | APIDocumentationRoute;
  public documentation_parameter_id: string | Buffer | APIDocumentationParameter;
  
  constructor(initializer: tNonFnPropsOptional<APIDocumentationRouteParameter> = {}) {
    super(initializer);
    if (initializer.documentation_route_id) {
      if (typeof initializer.documentation_route_id === "string") { this.documentation_route_id = Resource.bufferFromUUID(initializer.documentation_route_id); }
      else if (initializer.documentation_route_id instanceof Buffer) { this.documentation_route_id = initializer.documentation_route_id; }
      else {
        this.documentation_route_id = initializer.documentation_route_id.id;
      }
    }
    if (initializer.documentation_parameter_id) {
      if (typeof initializer.documentation_parameter_id === "string") { this.documentation_parameter_id = Resource.bufferFromUUID(initializer.documentation_parameter_id); }
      else if (initializer.documentation_parameter_id instanceof Buffer) { this.documentation_parameter_id = initializer.documentation_parameter_id; }
      else {
        this.documentation_parameter_id = initializer.documentation_parameter_id.id;
      }
    }
  }
  
}

Resource<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_ROUTE_PARAMETER, APIDocumentationRouteParameter, definition, options);
