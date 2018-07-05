import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  old_id:       {type: "varchar(14)", required: true, protected: true, unique_index: ["old_id"]},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class Subscription extends Resources.Constructor {
  
  public static readonly __type: string = "subscription";
  public static readonly __table: Table = new Table(Subscription, options, columns);
  
  public old_id: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iNewSubscriptionObject | iOldSubscriptionObject) {
    super(object);
  }
  
}

interface iNewSubscriptionObject {
  id: string | Buffer
  old_id?: number
  time_created?: number
  time_updated?: number
}

interface iOldSubscriptionObject {
  id?: string | Buffer
  old_id: string
  time_created?: number
  time_updated?: number
}
