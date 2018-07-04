import * as Resources from "../../../classes/Resource";
import * as Application from "../../../modules/Application";
import * as Database from "../../../modules/Database";
import * as Response from "../../../modules/Response";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import {env} from "../../../app";
import Merchant from "./Merchant";

export const options: Tables.iTableOptions = {};
export const columns: Tables.iTableColumns = {
  amount:         {type: "int(11)", protected: true, required: true},
  currency_id:    {type: "varchar(3)", protected: true, required: true, default: 208},
  order_id:       {type: "varchar(64)", protected: true, required: true},
  old_id:         {type: "int(11)", required: true, protected: true, unique_index: ["old_id"]},
  card_id:        {type: "binary(16)", required: true, protected: true, index: ["card"], relations: {table: "card"}},
  platform_id:    {type: "binary(16)", required: true, protected: true, index: ["platform"], relations: {table: "platform"}},
  institution_id: {type: "binary(16)", required: true, protected: true, index: ["institution"], relations: {table: "institution"}},
  cde_id:         {type: "varchar(64)", required: true, protected: true},
  short_id:       {type: "varchar(15)", required: true, protected: true},
  flag_test:      {type: "tinyint(1)", protected: true, default: 1},
  flag_pos:       {type: "tinyint(1)", protected: true, default: 0},
  flag_fee:       {type: "tinyint(1)", protected: true, default: 0},
  flag_secure:    {type: "tinyint(1)", protected: true, default: 0},
  time_created:   Table.generateTimeColumn("time_created"),
  time_updated:   Table.generateTimeColumn(),
  time_captured:  Table.generateTimeColumn(),
  time_refunded:  Table.generateTimeColumn(),
  time_released:  Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class Payment extends Resources.Constructor {
  
  public static readonly __type: string = "payment";
  public static readonly __table: Table = new Table(Payment, options, columns);
  
  public amount: number;
  public currency_id: string;
  public order_id: string;
  public old_id: string;
  public card_id: Buffer;
  public platform_id: Buffer;
  public institution_id: Buffer;
  public cde_id: string;
  public short_id: string;
  public flag_test: boolean;
  public flag_pos: boolean;
  public flag_fee: boolean;
  public flag_secure: boolean;
  public time_created: number;
  public time_updated: number;
  public time_captured: number;
  public time_refunded: number;
  public time_released: number;
  
  constructor(object?: iPaymentObject) {
    super(object);
  }
  
  public static migrate(merchant: Merchant, payment?: Payment) {
    const sql = payment.exists
                ? Database.parse("SELECT * FROM `02_payments` WHERE `merchantnumber` IN (?) LIMIT 100", [[merchant.old_id]])
                : Database.parse("SELECT * FROM `02_payments` WHERE `merchantnumber` IN (?) AND `PaymentID` = ? LIMIT 1", [[merchant.old_id], payment.old_id]);
    return Database.namespace("aurora_payments").query(sql)
    .then(payments => {
      
      console.log(payments);
      return payments;
    });
  }
  
}

Application.addRoute(env.subdomains.api, Payment.__type, "/migrate", "POST", [
  (request, response) => {
    let merchant_lookup;
    const time_started = Date.now();
    if (!request.body.merchant_token) { return response.status(400).json(new Response.JSON(400, "merchant_token", {merchant_token: request.body.merchant_token || ""}, time_started)); }
    Merchant.getMerchantId(request.body.merchant_token)
    .then(lookup => new Merchant({old_id: lookup.id}).validate().then(merchant => (merchant_lookup = lookup) && merchant.exists ? merchant : Merchant.migrate(lookup)))
    .then(merchant => console.log(request.body) || !request.body.id ? Payment.migrate(merchant) : new Payment({old_id: request.body.id}).validate().then(res => Payment.migrate(merchant, res)))
    .then(payments => response.json(new Response.JSON(200, "any", payments, time_started)))
    .catch(err => console.error(err) || response.status(400).json(new Response.JSON(400, "merchant_token", err, time_started)));
  }
]);

interface iPaymentObject {
  id?: string | Buffer
  amount?: number;
  currency_id?: string;
  order_id?: string;
  old_id?: string;
  card_id?: string | Buffer;
  platform_id?: string | Buffer;
  institution_id?: string | Buffer;
  cde_id?: string;
  short_id?: string;
  flag_test?: boolean;
  flag_pos?: boolean;
  flag_fee?: boolean;
  flag_secure?: boolean;
  time_created?: number;
  time_updated?: number;
  time_captured?: number;
  time_refunded?: number;
  time_released?: number;
}
