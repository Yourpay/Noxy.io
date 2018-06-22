import * as Application from "../../../modules/Application";
import * as Database from "../../../modules/Database";
import * as Response from "../../../modules/Response";
import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import User from "../../../resources/User";
import {env} from "../../../app";
import Promise from "aigle";
import * as _ from "lodash";
import PSP from "./PSP";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  psp_id:       {type: "binary(16)", required: true, protected: true, relations: {table: "psp"}},
  old_id:       {type: "int(11)", required: true, protected: true, unique_index: ["old_id"]},
  cvr:          {type: "varchar(12)", required: true, protected: true},
  name:         {type: "varchar(128)", required: true},
  address:      {type: "varchar(64)", required: true},
  city:         {type: "varchar(64)", required: true},
  postal:       {type: "varchar(12)", required: true},
  country:      {type: "varchar(84)", required: true},
  phone:        {type: "varchar(32)", required: true},
  website:      {type: "varchar(128)", required: true},
  logo:         {type: "text", default: ""},
  type_login:   {type: "tinyint(1)", default: 0, protected: true},
  mcc:          {type: "smallint(4)", default: 0, protected: true},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resource.implement<Resource.iResource>()
export default class Merchant extends Resource.Constructor {
  
  public static readonly __type: string = "merchant";
  public static readonly __table: Table = new Table(Merchant, options, columns);
  
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
    this.time_created = Date.now();
  }
  
  public static getMerchantId(merchant_token: string) {
    return Database.namespace("aurora_customer").query("SELECT merchantid as id, merchantid_prod as production_id, overall_merchantid as overall_id FROM `customer_cvr` WHERE merchant_token = ?", merchant_token)
    .then(res => {
      if (!res[0]) { throw new Error("Could not validate merchant_token,"); }
      return res[0];
    });
  }
  
  public static migrate(merchant: MerchantLookup): Promise<any> {
    return new Promise((resolve, reject) => {
      Promise.all([
        Merchant.getParentMerchants(merchant.overall_id, {}),
        Merchant.getEqualMerchants(merchant.overall_id, {}),
        Merchant.getSubMerchants(merchant.id, {})
      ])
      .then(res => {
        const master = _.find(res[0], row => row.overall_id === 0);
        console.log(master);
        Database.namespace("aurora_customer").query("SELECT * FROM `customer_cvr` WHERE merchantid IN (?)", [_.reduce(res, (result, value) => _.concat(result, _.keys(value)), [])])
        .then(res =>
          Promise.map(res, merchant =>
            new PSP({old_id: merchant.psper}).validate()
            .then(res =>
              new Merchant({
                address:    merchant.address,
                city:       merchant.city,
                country:    merchant.country,
                cvr:        merchant.cvr,
                logo:       merchant.logo,
                mcc:        merchant.mcc,
                name:       merchant.cvr_name,
                old_id:     merchant.merchantid,
                phone:      merchant.phone,
                postal:     merchant.postal,
                psp_id:     res.id,
                website:    merchant.website,
                type_login: merchant.alternate_dashboard
              }).save()
            )
            .catch(err => reject(err))
          )
          .then(res => resolve(res))
          .catch(err => reject(err))
        )
        .catch(err => reject(err));
      })
      .catch(err => reject(err));
    });
  }
  
  private static getParentMerchants(overall_id: number, merchants: {[id: string]: MerchantLookup}): Promise<{[id: string]: MerchantLookup}> {
    return new Promise((resolve, reject) => {
      Database.namespace("aurora_customer").query("SELECT `merchantid` as `id`, `overall_merchantid` as `overall_id`, `merchantid_prod` as `production_id` FROM `customer_cvr` WHERE merchantid = ?", overall_id)
      .then((res: MerchantLookup[]) => {
        const row: MerchantLookup = res[0];
        merchants[row.id] = row;
        row.overall_id > 0 ? Merchant.getParentMerchants(row.overall_id, merchants).then(res => resolve(res), err => reject(err)) : resolve(merchants);
      })
      .catch(err => reject(err));
    });
  }
  
  private static getEqualMerchants(overall_id: number, merchants: {[id: string]: MerchantLookup}): Promise<{[id: string]: MerchantLookup}> {
    return new Promise((resolve, reject) => {
      Database.namespace("aurora_customer").query("SELECT `merchantid` as `id`, `overall_merchantid` as `overall_id`, `merchantid_prod` as `production_id` FROM `customer_cvr` WHERE overall_merchantid = ?", overall_id)
      .then((res: MerchantLookup[]) => resolve(_.transform(res, (result, value, key) => _.set(result, value.id, value), {})))
      .catch(err => reject(err));
    });
  }
  
  private static getSubMerchants(merchant_id: number, merchants: {[id: string]: MerchantLookup}): Promise<{[id: string]: MerchantLookup}> {
    return new Promise((resolve, reject) => {
      Database.namespace("aurora_customer").query("SELECT `merchantid` as `id`, `overall_merchantid` as `overall_id`, `merchantid_prod` as `production_id` FROM `customer_cvr` WHERE overall_merchantid = ?", merchant_id)
      .then((res: MerchantLookup[]) => {
        Promise.map(res, row => Merchant.getSubMerchants((merchants[row.id] = row).id, merchants))
        .then(res => resolve(res))
        .catch(err => reject(err));
      })
      .catch(err => reject(err));
    })
    .then(() => merchants);
  }
  
}

Application.addRoute(env.subdomains.api, Merchant.__type, "/migrate", "POST", [
  (request, response, next) => {
    const time_started = Date.now();
    if (!request.body.merchant_token) { return response.status(400).json(new Response.JSON(400, "merchant_token", {merchant_token: request.body.merchant_token || ""}, time_started)); }
    Merchant.getMerchantId(request.body.merchant_token)
    .then(res => {
      Merchant.migrate(res)
      .then(res => { response.status(200).json(res); })
      .catch(err => { response.status(500).json(err); });
    })
    .catch(err => console.log(1, err) || response.status(400).json(new Response.JSON(400, "merchant_token", err, time_started)));
  }
]);

type MerchantLookup = {id: number, production_id: number, overall_id: number};

interface iMerchantObject {
  id?: string
  psp_id?: string | Buffer
  old_id?: number
  cvr?: string
  name?: string
  address?: string
  city?: string
  postal?: string
  country?: string
  phone?: string
  website?: string
  logo?: string
  type_login?: number
  mcc?: number
  time_created?: number
  time_updated?: number
}
