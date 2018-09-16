import {tNonFnPropsOptional} from "../../../interfaces/iAuxiliary";
import {eResourceType} from "../../../interfaces/iResource";
import * as Resource from "../../../modules/Resource";
import Route from "../../../resources/Route";
import {eDocumentationType} from "../init";

const definition = {
  documentation_id: Resource.Table.toReferenceColumn<eDocumentationType>(eDocumentationType.DOCUMENTATION),
  route_id:         Resource.Table.toReferenceColumn<eResourceType>(eResourceType.ROUTE),
  description:      {type: "text", default: ""},
  time_created:     Resource.Table.toTimeColumn("time_created"),
  time_updated:     Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class DocumentationRoute extends Resource.Constructor {
  
  public documentation_id: string | Buffer;
  public route_id: string | Buffer | Route;
  public description: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(initializer: tNonFnPropsOptional<DocumentationRoute> = {}) {
    super(initializer);
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
    if (initializer.user_created) {
      if (typeof initializer.route_id === "string") { this.route_id = Resource.bufferFromUUID(initializer.route_id); }
      else if (initializer.route_id instanceof Buffer) { this.route_id = initializer.route_id; }
      else {
        this.route_id = initializer.route_id.id;
      }
    }
  }
  
}

Resource<eDocumentationType>(eDocumentationType.DOCUMENTATION_ROUTE, DocumentationRoute, definition, options);
