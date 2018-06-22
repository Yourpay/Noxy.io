import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  psp_id:       {type: "binary(16)", required: true, protected: true, unique_index: ["psp"], relations: {table: "psp"}},
  percentage:   {type: "decimal(6,3)", required: true},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resource.implement<Resource.iResource>()
export default class PSPKickback extends Resource.Constructor {
  
  public static readonly __type: string = "psp/kickback";
  public static readonly __table: Table = new Table(PSPKickback, options, columns);
  
  public psp_id: Buffer;
  public percentage: number;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iPSPKickbackObject) {
    super(object);
    this.psp_id = typeof object.psp_id === "string" ? Resource.Constructor.bufferFromUuid(object.psp_id) : object.psp_id;
    this.time_created = Date.now();
  }
  
}

interface iPSPKickbackObject {
  id?: string | Buffer
  psp_id?: string | Buffer
  percentage?: number
  time_created?: number
  time_updated?: number
}
