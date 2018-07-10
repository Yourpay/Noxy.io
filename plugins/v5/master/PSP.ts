import * as Database from "../../../modules/Database";
import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import * as he from "he";
import PSPKickback from "./PSPKickback";
import PSPFinder from "./PSPFinder";
import Promise from "aigle";
import {databases} from "../init";
import iYourpayPSPObject from "../interfaces/iYourpayPSPObject";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  old_id:          {type: "int(11)", required: true, unique_index: ["old_id"]},
  name:            {type: "varchar(128)", required: true, protected: true},
  contact:         {type: "varchar(128)", required: true, protected: true},
  volume:          {type: "int(11)", required: true},
  settlement_days: {type: "int(3)", required: true},
  percentage:      {type: "decimal(5,2)", required: true},
  time_created:    Table.generateTimeColumn("time_created"),
  time_updated:    Table.generateTimeColumn()
};

@Resource.implement<Resource.iResource>()
export default class PSP extends Resource.Constructor {
  
  public static readonly __type: string = "psp";
  public static readonly __table: Table = new Table(PSP, options, columns);
  
  public old_id: number;
  public name: string;
  public contact: string;
  public volume: number;
  public settlement_days: number;
  public percentage: number;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iPSPObject) {
    super(object);
    this.time_created = Date.now();
  }
  
  public static migrate(): Promise<any> {
    return Database.namespace(databases.customer).query("SELECT * FROM `crm_login_psp` WHERE deactivated = 0 OR (SELECT count(*) FROM `customer_cvr` WHERE psper = pspid) > 0")
    .map((row: iYourpayPSPObject) =>
      new PSP({
        name:            decodeURIComponent(he.decode(row.name)),
        contact:         decodeURIComponent(row.response),
        old_id:          row.pspid,
        volume:          row.volume_total + row.total_volume,
        settlement_days: row.settlement_days,
        percentage:      row.merchant_percentage / 100
      }).save()
      .then(psp =>
        Promise.all([
          row.finders_fee === 0 ? <any>Promise.resolve() : new PSPFinder({psp_id: psp.id, amount: row.finders_fee, currency_id: `${row.finders_fee_currency}`}).save(),
          row.percentage === 0 ? <any>Promise.resolve() : new PSPKickback({psp_id: psp.id, percentage: row.percentage / 1000}).save()
        ])
        .then(() => psp)
      )
    );
  }
  
}

interface iPSPObject {
  id?: string | Buffer
  old_id?: number
  name?: string
  contact?: string
  volume?: number
  settlement_days?: number
  percentage?: number
  time_created?: number
  time_updated?: number
}
