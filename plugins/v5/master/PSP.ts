import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import User from "../../../resources/User";

const options: Tables.iTableOptions = {};

const columns: Tables.iTableColumns = {
  old_id:              {type: "int(11)", required: true, unique_index: ["old_id"]},
  name:                {type: "varchar(128)", required: true, protected: true},
  volume:              {type: "int(11)", required: true},
  settlement_days:     {type: "int(3)", required: true},
  percentage_fee:      {type: "decimal(3,2)", required: true},
  percentage_kickbcak: {type: "decimal(3,2)", required: true},
  user_created:        Table.generateUserColumn("user_created"),
  time_created:        Table.generateTimeColumn("time_created"),
  time_updated:        Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class PSP extends Resources.Constructor {
  
  public static __table: Table = new Table("psp", options, columns);
  
  public old_id: number;
  public name: string;
  public volume: number;
  public settlement_days: number;
  public percentage_fee: number;
  public percentage_kickback: number;
  public user_created: User;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iPSPObject) {
    super(object);
  }
  
}

interface iPSPObject {
  id?: string | Buffer
  old_id: string
  name: string
  volume?: number
  settlement_days?: number
  percentage_fee?: number
  percentage_kickback?: number
  user_created?: User
  time_created?: number
  time_updated?: number
}
