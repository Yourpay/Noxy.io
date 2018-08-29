import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  documentation_id: Table.generateRelationColumn("documentation"),
  route_id:         Table.generateRelationColumn("route"),
  description:      {type: "text", default: ""},
  time_created:     Table.generateTimeColumn("time_created"),
  time_updated:     Table.generateTimeColumn(null, true)
};

@Resource.implement<Resource.iResource>()
export default class DocumentationRoute extends Resource.Constructor {
  
  public static readonly __type: string = "documentation/route";
  public static readonly __table: Table = new Table(DocumentationRoute, options, columns);
  
  public route_id: string | Buffer;
  public description: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object: iResourceObject = {}) {
    super(object);
    this.route_id = typeof object.route_id === "string" ? Resource.Constructor.bufferFromUuid(object.route_id) : object.route_id;
    this.time_created = object.time_created ? object.time_created : Date.now();
  }
  
}

interface iQueryObject {
  id?: string
  route_id?: string | Buffer
  description?: string
  time_created?: number
  time_updated?: number
}

interface iResourceObject extends iQueryObject {

}
