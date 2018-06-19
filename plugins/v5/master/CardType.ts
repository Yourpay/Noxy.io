import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  name:         {type: "varchar(64)", required: true, protected: true},
  pattern:      {type: "varchar(12)", required: true, protected: true, unique_index: ["pattern"]},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class CardType extends Resources.Constructor {
  
  public static __table: Table = new Table("card/type", options, columns);
  
  public name: string;
  public pattern: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iCardTypeObject) {
    super(object);
    this.time_created = Date.now();
  }
  
}

interface iCardTypeObject {
  id?: string | Buffer
  name: string
  pattern: string
  time_created?: number
  time_updated?: number
}
