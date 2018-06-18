import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import {Table} from "../../../classes/Table";
import User from "../../../resources/User";

const options: Tables.iTableOptions = {};

const columns: Tables.iTableColumns = {
  psp_id:            {type: "binary(16)", required: true, protected: true, relations: [{table: "psp", column: "id"}]},
  old_id:            {type: "int(11)", required: true, protected: true, unique_index: ["old_id"]},
  cvr:               {type: "varchar(12)", required: true, protected: true},
  name:              {type: "varchar(128)", required: true},
  address:           {type: "varchar(64)", required: true},
  city:              {type: "varchar(64)", required: true},
  postal:            {type: "varchar(12)", required: true},
  country:           {type: "varchar(84)", required: true},
  phone:             {type: "varchar(32)", required: true},
  website:           {type: "varchar(128)", required: true},
  logo:              {type: "text", default: ""},
  type_login:        {type: "tinyint(1)", default: 0, protected: true},
  mcc:               {type: "smallint(4)", default: 0, protected: true},
  pipedrive_deal_id: {type: "int(11)", default: 0},
  pipedrive_org_id:  {type: "int(11)", default: 0},
  pipedrive_sale_id: {type: "int(11)", default: 0},
  user_created:      Table.generateUserColumn("user_created"),
  time_created:      Table.generateTimeColumn("time_created"),
  time_updated:      Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class Merchant extends Resources.Constructor {
  
  public static __table: Table = new Table("merchant", options, columns);
  
  public psp_id: string | Buffer;
  public old_id: number;
  public cvr: string;
  public name: string;
  public address: string;
  public city: string;
  public postal: string;
  public country: string;
  public phone: string;
  public website: string;
  public logo: string;
  public type_login: number;
  public mcc: number;
  public pipedrive_deal_id: number;
  public pipedrive_org_id: number;
  public pipedrive_sale_id: number;
  public user_created: User;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iMerchantObject) {
    super(object);
  }
  
}

interface iMerchantObject {
  id?: string
  psp_id: string | Buffer
  old_id: number
  cvr: string
  name: string
  address: string
  city: string
  postal: string
  country: string
  phone: string
  website: string
  logo: string
  type_login: number
  mcc: number
  pipedrive_deal_id: number
  pipedrive_org_id: number
  pipedrive_sale_id: number
  user_created: User
  time_created: number
  time_updated: number
}
