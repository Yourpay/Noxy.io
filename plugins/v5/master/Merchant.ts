import * as Application from "../../../modules/Application";
import * as Database from "../../../modules/Database";
import * as Response from "../../../modules/Response";
import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import {env} from "../../../app";
import Promise from "aigle";
import * as _ from "lodash";
import * as he from "he";
import iYourpayMerchantObject from "../interfaces/iYourpayMerchantObject";
import PSP from "./PSP";
import MerchantHierarchy from "./MerchantHierarchy";
import iYourpayMerchantLookupObject from "../interfaces/iYourpayMerchantLookupObject";
import User from "../../../resources/User";
import iYourpayLoginObject from "../interfaces/iYourpayLoginObject";
import RoleUser from "../../../resources/RoleUser";
import MerchantUser from "./MerchantUser";
import {publicize_queue} from "../../../init/publicize";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  old_id:         {type: "int(11)", required: true, protected: true, unique_index: ["old_id"]},
  cvr:            {type: "varchar(12)", required: true, protected: true},
  name:           {type: "varchar(128)", required: true},
  address:        {type: "varchar(64)", required: true},
  city:           {type: "varchar(64)", required: true},
  postal:         {type: "varchar(12)", required: true},
  country:        {type: "varchar(84)", required: true},
  phone:          {type: "varchar(32)", required: true},
  website:        {type: "varchar(128)", required: true},
  logo:           {type: "text", default: ""},
  psp_id:         {type: "binary(16)", required: true, protected: true, relations: {table: "psp"}},
  mcc:            {type: "smallint(4)", default: 0, protected: true},
  type_login:     {type: "tinyint(1)", default: 0, protected: true},
  merchant_token: {type: "varchar(32)", protected: true, required: true},
  time_created:   Table.generateTimeColumn("time_created"),
  time_updated:   Table.generateTimeColumn()
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
  public mcc: number;
  public type_login: number;
  public merchant_token: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iMerchantObject) {
    super(object);
    this.time_created = Date.now();
  }
  
  public static getMerchantLookup(merchant_identifier: string | number): Promise<iYourpayMerchantLookupObject> {
    const type = typeof merchant_identifier === "string" ? "`merchant_token` = ?" : "`merchantid` = ? OR `merchantid_prod` = ?";
    return Database.namespace("aurora_customer")
    .query("SELECT `merchantid` as `id`, `merchantid_prod` as `production_id`, `overall_merchantid` as `overall_id` FROM `customer_cvr` WHERE " + type, [merchant_identifier, merchant_identifier])
    .then(res => {
      if (!res[0]) { throw new Error("Could not validate merchant_token."); }
      return res[0];
    });
  }
  
  public static migrate(merchant_lookup: iYourpayMerchantLookupObject): Promise<any> {
    let master_lookup: iYourpayMerchantLookupObject, master_user: User;
    const merchants: {[key: number]: Merchant} = {}, users = {}, role_users = {}, merchant_user = {}, di_logins = {};
    return Merchant.getMasterMerchant(merchant_lookup)
    .then(master => Merchant.getDomains(master_lookup = master).then(res => _.flattenDeep(res)))
    .map((lookup: iYourpayMerchantLookupObject) => Database.namespace("aurora_customer").query("SELECT * FROM `customer_cvr` WHERE merchantid = ?", lookup.id).then(res => ({di_merchant: res[0]})))
    .map((migration: iYourpayMerchantMigrationObject) => new PSP({old_id: migration.di_merchant.psper}).validate().then(res => _.set(migration, "psp", res)))
    .map((migration: iYourpayMerchantMigrationObject) =>
      new Merchant({
        psp_id:         migration.psp.id,
        mcc:            migration.di_merchant.mcc,
        type_login:     migration.di_merchant.alternate_dashboard,
        website:        he.decode(decodeURIComponent(_.trim(migration.di_merchant.website, " ,."))),
        postal:         migration.di_merchant.postal,
        phone:          migration.di_merchant.phone,
        old_id:         migration.di_merchant.merchantid,
        name:           he.decode(decodeURIComponent(_.trim(migration.di_merchant.cvr_name, " ,."))),
        logo:           migration.di_merchant.logo,
        cvr:            migration.di_merchant.cvr,
        country:        he.decode(decodeURIComponent(_.trim(migration.di_merchant.country, " ,."))),
        city:           he.decode(decodeURIComponent(_.trim(migration.di_merchant.city, " ,."))),
        address:        he.decode(decodeURIComponent(_.trim(migration.di_merchant.address, " ,."))),
        merchant_token: migration.di_merchant.merchant_token
      }).save().then(merchant => _.set(migration, "merchant", merchants[migration.di_merchant.merchantid] = merchant))
    )
    .map((migration: iYourpayMerchantMigrationObject) =>
      new MerchantHierarchy({
        merchant_id: migration.merchant.id,
        master_id:   merchants[master_lookup.id].id,
        superior_id: merchants[migration.di_merchant.overall_merchantid || master_lookup.id].id
      }).save().then(hierarchy => _.set(migration, "hierarchy", hierarchy))
    )
    .map((migration: iYourpayMerchantMigrationObject) =>
      Database.namespace("aurora_customer").query("SELECT * FROM `customer_logins` WHERE merchantid = ? LIMIT 1", migration.merchant.old_id)
      .then((login_lookup: iYourpayLoginObject[]) => _.set(migration, "di_login", login_lookup[0] ? di_logins[migration.merchant.old_id] = login_lookup[0] : null))
    )
    .map((migration: iYourpayMerchantMigrationObject) => {
      if (!migration.di_login) { migration.di_login = di_logins[master_lookup.id] || _.values(di_logins)[0]; }
      const email = migration.di_login.uemail || migration.di_login.username;
      if (!users[email]) {
        users[email] = new User({
          username: migration.di_login.name || migration.di_login.username || migration.di_login.uemail,
          email:    migration.di_login.uemail || migration.di_login.username,
          password: "wJEgyiE99ie?W?&I"
        }).save();
      }
      return users[email].then(user => _.set(migration, "user", user));
    })
    .map((migration: iYourpayMerchantMigrationObject) => {
      if (!role_users[migration.user.uuid]) { role_users[migration.user.uuid] = new RoleUser({user_id: migration.user.id, role_id: env.roles.user.id}).save(); }
      return role_users[migration.user.uuid].then(role_user => _.set(migration, "role_user ", role_user));
    })
    .map((migration: iYourpayMerchantMigrationObject) => {
      if (!merchant_user[migration.merchant.uuid]) { merchant_user[migration.merchant.uuid] = new MerchantUser({user_id: migration.user.id, merchant_id: migration.merchant.id}).save(); }
      return merchant_user[migration.merchant.uuid].then(merchant_user => _.set(migration, "merchant_user", merchant_user));
    })
    .map((migration: iYourpayMerchantMigrationObject) => migration.merchant)
    .catch(err => console.log(err) || err);
  }
  
  public static getMasterMerchant(merchant: iYourpayMerchantLookupObject): Promise<iYourpayMerchantLookupObject> {
    return Database.namespace("aurora_customer")
    .query("SELECT `merchantid` as `id`, `overall_merchantid` as `overall_id`, `merchantid_prod` as `production_id` FROM `customer_cvr` WHERE merchantid = ?", merchant.overall_id)
    .then((res: iYourpayMerchantLookupObject[]) => !res[0] ? merchant : (res[0].overall_id === 0 ? res[0] : Merchant.getMasterMerchant(res[0])));
  }
  
  public static getDomains(merchant: iYourpayMerchantLookupObject): Promise<iYourpayMerchantLookupObject[]> {
    return Database.namespace("aurora_customer")
    .query("SELECT `merchantid` as `id`, `overall_merchantid` as `overall_id`, `merchantid_prod` as `production_id` FROM `customer_cvr` WHERE overall_merchantid = ?", merchant.id)
    .then(res => <any>(res.length > 0 ? Promise.map(res, (merchant_lookup: iYourpayMerchantLookupObject) => Merchant.getDomains(merchant_lookup)).then(res => _.concat(<any>merchant, res)) : [merchant]))
    .then(res => _.flattenDeep(res));
  }
  
}

publicize_queue.promise("setup", resolve => {
  Application.addRoute(env.subdomains.api, Merchant.__type, "/migrate", "POST", [
    (request, response) => {
      const time_started = Date.now();
      if (!request.body.merchant_token) { return response.status(400).json(new Response.JSON(400, "merchant_token", {merchant_token: request.body.merchant_token || ""}, time_started)); }
      Merchant.getMerchantLookup(request.body.merchant_token)
      .then(res =>
        Merchant.migrate(res)
        .then(res => { response.status(200).json(res); })
        .catch(err => { response.status(500).json(err); })
      )
      .catch(err => response.status(400).json(new Response.JSON(400, "merchant_token", err, time_started)));
    }
  ]);
  resolve();
});

interface iYourpayMerchantMigrationObject {
  di_merchant: iYourpayMerchantObject
  di_login: iYourpayLoginObject
  merchant: Merchant
  psp: PSP
  user: User
  hierarchy: MerchantHierarchy
}

interface iMerchantObject {
  id?: string | Buffer
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
  mcc?: number
  type_login?: number
  merchant_token?: string
  time_created?: number
  time_updated?: number
}

