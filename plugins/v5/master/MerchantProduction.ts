import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  merchant_id:  {type: "binary(16)", required: true, protected: true, index: ["merchant_id"], relations: {table: "merchant"}},
  old_id:       {type: "int(11)", required: true, protected: true, unique_index: ["old_id"]},
  mcc:          {type: "smallint(4)", default: 0, protected: true},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resource.implement<Resource.iResource>()
export default class MerchantProduction extends Resource.Constructor {
  
  public static readonly __type: string = "merchant/production";
  public static readonly __table: Table = new Table(MerchantProduction, options, columns);
  
  public merchant_id: Buffer;
  public old_id: number;
  public mcc: number;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iMerchantProductionObject) {
    super(object);
    this.time_created = Date.now();
  }
  
}

interface iMerchantProductionObject {
  [key: string]: any
  
  id?: string | Buffer
  old_id?: number
  mcc?: number
  time_created?: number
  time_updated?: number
}
