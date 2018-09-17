import * as _ from "lodash";
import {tNonFnPropsOptional} from "../../../interfaces/iAuxiliary";
import {iTableOptions} from "../../../interfaces/iResource";
import * as Resource from "../../../modules/Resource";
import {eDocumentationType} from "../init";
import DocumentationParameter from "./DocumentationParameter";
import DocumentationRoute from "./DocumentationRoute";

const definition = {
  documentation_route_id:     Resource.Table.toReferenceColumn<eDocumentationType>(eDocumentationType.DOCUMENTATION_ROUTE),
  documentation_parameter_id: Resource.Table.toReferenceColumn<eDocumentationType>(eDocumentationType.DOCUMENTATION_PARAMETER)
};
const options: iTableOptions = {resource: {junction: true}};

export default class DocumentationRouteParameter extends Resource.Constructor {
  
  public documentation_route_id: string | Buffer | DocumentationRoute;
  public documentation_parameter_id: string | Buffer | DocumentationParameter;
  
  constructor(initializer: tNonFnPropsOptional<DocumentationRouteParameter> = {}) {
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

Resource<eDocumentationType>(eDocumentationType.DOCUMENTATION_ROUTE_PARAMETER, DocumentationRouteParameter, definition, options);
