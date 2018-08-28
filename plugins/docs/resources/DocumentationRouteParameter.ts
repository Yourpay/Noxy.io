import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {
  junction: true
};
const columns: Tables.iTableColumns = {
  documentation_route_id:     {type: "binary(16)", protected: true, required: true, primary_key: true, index: "documentation_route", relation: "documentation/route"},
  documentation_parameter_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: "documentation_parameter", relation: "documentation/parameter"}
};

@Resource.implement<Resource.iResource>()
export default class DocumentationRouteParameter extends Resource.Constructor {
  
  public static readonly __type: string = "documentation/route/parameter";
  public static readonly __table: Table = new Table(DocumentationRouteParameter, options, columns);
  
  public documentation_route_id: Buffer;
  public documentation_parameter_id: Buffer;
  
  constructor(object: iResourceObject) {
    super(object);
    this.documentation_route_id = typeof object.documentation_route_id === "string" ? Resource.Constructor.bufferFromUuid(object.documentation_route_id) : object.documentation_route_id;
    this.documentation_parameter_id = typeof object.documentation_parameter_id === "string" ? Resource.Constructor.bufferFromUuid(object.documentation_parameter_id) : object.documentation_parameter_id;
  }
  
}

interface iQueryObject {
  documentation_route_id: string | Buffer
  documentation_parameter_id: string | Buffer
}

interface iResourceObject extends iQueryObject {

}
