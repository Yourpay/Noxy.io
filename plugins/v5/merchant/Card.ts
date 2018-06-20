import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import App from "../master/App";

export const type = "card";

export const options: Tables.iTableOptions = {
  coextensive: true
};
export const columns: Tables.iTableColumns = {
  type_id:      {type: "binary(16)", required: true, protected: true},
  name:         {type: "varchar(64)", required: true, protected: true, unique_index: ["card"]},
  number:       {type: "varchar(16)", required: true, protected: true, unique_index: ["card"]},
  country_id:   {type: "varchar(3)", required: true, protected: true},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class Card extends Resources.Constructor {
  
  public static readonly __type: string = "card";
  public static readonly __table: Table = new Table(App, options, columns);
  
  public type_id: string;
  public name: string;
  public number: string;
  public country_id: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iCardObject) {
    super(object);
  }
  
}

interface iCardObject {
  id?: string | Buffer
  type_id: string | Buffer
  name: string
  number: string
  country_id: string
  time_created?: number
  time_updated?: number
}
