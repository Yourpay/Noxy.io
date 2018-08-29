import * as _ from "lodash";
import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: "key"},
  description:  {type: "text", default: ""},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn(null, true)
};

@Resource.implement<Resource.iResource>()
export default class Documentation extends Resource.Constructor {
  
  public static readonly __type: string = "documentation";
  public static readonly __table: Table = new Table(Documentation, options, columns);
  
  public name: string;
  public key: string;
  public description: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object: iResourceObject = {}) {
    super(object);
    if (!object.key) { this.key = _.snakeCase(_.deburr(object.name)); }
    this.time_created = object.time_created ? object.time_created : Date.now();
  }
  
}

interface iQueryObject {
  id?: string
  name?: string
  key?: string
  description?: string
  time_created?: number
  time_updated?: number
}

interface iResourceObject extends iQueryObject {

}
