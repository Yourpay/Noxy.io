import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  name:         {type: "varchar(64)", required: true, protected: true, unique_index: ["platform"]},
  domain:       {type: "varchar(64)", required: true, protected: true, unique_index: ["platform"]},
  version:      {type: "varchar(15)", required: true, protected: true, unique_index: ["platform"]},
  time_created: Table.generateTimeColumn("time_created", true),
  time_updated: Table.generateTimeColumn(null, true)
};

@Resources.implement<Resources.iResource>()
export default class Platform extends Resources.Constructor {
  
  public static readonly __type: string = "platform";
  public static readonly __table: Table = new Table(Platform, options, columns);
  
  public name: string;
  public domain: string;
  public version: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iNewInstitutionObject | iCurrentInstitutionObject) {
    super(object);
  }
  
}

interface iNewInstitutionObject {
  id?: string | Buffer
  name: string
  domain: string
  version: string
  time_created?: number
  time_updated?: number
}

interface iCurrentInstitutionObject {
  id: string | Buffer
  name?: string
  domain?: string
  version?: string
  time_created?: number
  time_updated?: number
}
