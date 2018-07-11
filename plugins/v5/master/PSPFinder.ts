import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  psp_id:       {type: "binary(16)", required: true, protected: true, unique_index: ["psp"], relations: {table: "psp"}},
  amount:       {type: "int(11)", required: true},
  currency_id:  {type: "varchar(3)", required: true},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resource.implement<Resource.iResource>()
export default class PSPFinder extends Resource.Constructor {
  
  public static readonly __type: string = "psp/finder";
  public static readonly __table: Table = new Table(PSPFinder, options, columns);
  
  public psp_id: Buffer;
  public amount: number;
  public currency_id: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iPSPFinderObject) {
    super(object);
    this.psp_id = typeof object.psp_id === "string" ? Resource.Constructor.bufferFromUuid(object.psp_id) : object.psp_id;
    this.time_created = Date.now();
  }
  
}

interface iPSPFinderObject {
  id?: string | Buffer
  psp_id?: string | Buffer
  amount: number
  currency_id: string
  time_created?: number
  time_updated?: number
}
