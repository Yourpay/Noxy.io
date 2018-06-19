import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import Endpoint from "../classes/Endpoint";
import {env} from "../app";

const type = "route";
const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  subdomain:    {type: "varchar(64)", protected: true, required: true, unique_index: ["route"]},
  path:         {type: "varchar(64)", protected: true, required: true, unique_index: ["route"]},
  method:       {type: "enum('GET','POST','PUT','DELETE', 'PATCH')", protected: true, required: true, unique_index: ["route"]},
  flag_active:  {type: "tinyint(1)", default: "0"},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class Route extends Resources.Constructor {
  
  public static __table: Table = new Table(type, options, columns);
  public static __endpoint: Endpoint = new Endpoint(env.subdomains.api, type).addResource(Route);
  
  public method: string;
  public path: string;
  public subdomain: string;
  public flag_active: boolean;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iRouteObject) {
    super(object);
    this.time_created = Date.now();
  }
  
}

interface iRouteObject {
  id?: string
  method?: string
  path?: string
  subdomain?: string
  flag_active?: boolean
}
