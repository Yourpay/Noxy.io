import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  name:         {type: "varchar(128)", required: true, protected: true, unique_index: ["name"]},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class Institution extends Resources.Constructor {
  
  public static readonly __type: string = "institution";
  public static readonly __table: Table = new Table(Institution, options, columns);
  
  public name: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iInstitutionObject) {
    super(object);
  }
  
}

interface iInstitutionObject {
  id?: string | Buffer
  name: string
  time_created?: number
  time_updated?: number
}
