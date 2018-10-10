import {tNonFnPropsOptional} from "../../../interfaces/iAuxiliary";
import {iTableDefinition, iTableOptions} from "../../../interfaces/iResource";
import * as Resource from "../../../modules/Resource";
import {eAPIDocumentationType} from "../init";
import APIDocumentationParameter from "./APIDocumentationParameter";
import APIDocumentationRoute from "./APIDocumentationRoute";

const definition: iTableDefinition = {
  documentation_route_id:     Resource.Table.toReferenceColumn<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_ROUTE),
  documentation_parameter_id: Resource.Table.toReferenceColumn<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_PARAMETER)
};
const options: iTableOptions = {resource: {junction: true}};

export default class APIDocumentationRouteParameter extends Resource.Constructor {
  
  public documentation_route_id: string | Buffer | APIDocumentationRoute;
  public documentation_parameter_id: string | Buffer | APIDocumentationParameter;
  
  constructor(initializer: tNonFnPropsOptional<APIDocumentationRouteParameter> = {}) {
    super(initializer);
  }
  
}

Resource<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_ROUTE_PARAMETER, APIDocumentationRouteParameter, definition, options);
