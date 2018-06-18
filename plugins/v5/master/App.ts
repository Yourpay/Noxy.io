import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import {Table} from "../../../classes/Table";

export const type = "card";

export const columns: Tables.iTableColumns = {
  name:         {type: "varchar(64)", required: true, protected: true, unique_index: ["card"]},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class App extends Resources.Constructor {
  
  public name: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iAppObject) {
    super(object);
  }
  
}

interface iAppObject {
  id?: string | Buffer
  name: string
  time_created?: number
  time_updated?: number
}
