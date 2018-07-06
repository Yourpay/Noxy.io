import * as Resource from "../../../classes/Resource";
import * as Application from "../../../modules/Application";
import * as Database from "../../../modules/Database";
import * as Response from "../../../modules/Response";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import {env} from "../../../app";
import Merchant from "./Merchant";
import Promise from "aigle";
import Platform from "./Platform";
import Institution from "./Institution";
import Card from "./Card";
import PaymentCapture from "./PaymentCapture";
import PaymentRefund from "./PaymentRefund";
import PaymentRelease from "./PaymentRelease";
import PaymentFailure from "./PaymentFailure";
import * as _ from "lodash";
import iYourpayPaymentObject from "../interfaces/iYourpayPaymentObject";
import iYourpayPaymentActionObject from "../interfaces/iYourpayPaymentActionObject";
import PaymentFee from "./PaymentFee";

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

@Resource.implement<Resource.iResource>()
export default class Payment extends Resource.Constructor {
  
  public static readonly __type: string = "payment";
  public static readonly __table: Table = new Table(Payment, options, columns);
  
  public amount: number;
  public currency_id: string;
  public order_id: string;
  public old_id: number;
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
    const subscriptions = {}, cards = {}, institutions = {}, platforms = {};
    const sql = payment && payment.exists
                ? Database.parse("SELECT * FROM `02_payments` WHERE `merchantnumber` IN (?) AND `PaymentID` = ? LIMIT 1", [[merchant.old_id], payment.old_id])
                : Database.parse("SELECT * FROM `02_payments` WHERE `merchantnumber` IN (?) LIMIT 3", [[merchant.old_id]]);
    return Database.namespace("aurora_payments").query(sql).map((di_payment: iYourpayPaymentObject) => {
    
      /* Get subscription and update card details. */
    
      if (!di_payment.connected_subscriptioncode) { return {di_payment: di_payment}; }
      if (subscriptions[di_payment.connected_subscriptioncode]) { return {di_payment: _.merge(di_payment, _.pick(subscriptions[di_payment.connected_subscriptioncode], ["cardno", "cardholder", "card_country"]))}; }
      return subscriptions[di_payment.connected_subscriptioncode] = Database.namespace("aurora_payments").query("SELECT * FROM `02_payments` WHERE shortid_ccrg = ? LIMIT 1", [di_payment.connected_subscriptioncode])
      .then(subscription_payment => ({di_payment: _.merge(di_payment, _.pick(subscription_payment, ["cardno", "cardholder", "card_country"]))}));
    })
    .map((migration: iPaymentMigrationObject) => {
    
      /* Get card type, card details, and generate card */
    
      migration.di_payment.cardno = migration.di_payment.cardno.replace(/\s/g, "").match(/\d{6}x{6}\d{4}/gi) ? migration.di_payment.cardno : "000000XXXXXX0000";
      migration.di_payment.cardholder = migration.di_payment.cardholder.replace(/\s/g, "") !== "" ? migration.di_payment.cardholder : "Unknown";
      return Database.namespace("master").query("SELECT * FROM `card/type` WHERE LOCATE(`pattern`, ?) = 1 ORDER BY LENGTH(`pattern`) DESC LIMIT 1", migration.di_payment.cardno.substring(0, 6))
      .then(card_types => {
        if (!card_types[0]) { throw new Error("Could not validate card type"); }
        const card_id = `${migration.di_payment.cardholder}::${migration.di_payment.cardno}::${migration.di_payment.card_country}`;
        if (!cards[card_id]) { cards[card_id] = new Card({type_id: card_types[0].id, name: migration.di_payment.cardholder, number: migration.di_payment.cardno, country_id: migration.di_payment.card_country}).save(); }
        return cards[card_id].then(card => _.set(migration, "card", card));
      });
    })
    .map((migration: iPaymentMigrationObject) => {
      if (migration.di_payment.platform.match("/^viabill$/i")) { migration.di_payment.payment_institute = 7; }
      if (migration.di_payment.platform.match("/^resurs(?:bank)?$/i")) { migration.di_payment.payment_institute = 8; }
      if (migration.di_payment.platform.match("/^quickpay$/i")) { migration.di_payment.payment_institute = 9; }
      if (!institutions[migration.di_payment.payment_institute]) { institutions[migration.di_payment.payment_institute] = new Institution({old_id: migration.di_payment.payment_institute}).validate(); }
      return institutions[migration.di_payment.payment_institute].then(institution => _.set(migration, "institution", institution));
    })
    .map((migration: iPaymentMigrationObject) => {
      const platform_id = `${migration.di_payment.platform}::${migration.di_payment.platform_domain}::${migration.di_payment.version}`;
      if (!platforms[platform_id]) { platforms[platform_id] = new Platform({name: migration.di_payment.platform, domain: migration.di_payment.platform_domain, version: migration.di_payment.version}).save(); }
      return platforms[platform_id].then(platform => _.set(migration, "platform", platform));
    })
    .map((migration: iPaymentMigrationObject) =>
      new Payment({
        amount:         migration.di_payment.amount,
        currency_id:    migration.di_payment.Currency,
        order_id:       migration.di_payment.orderID,
        old_id:         migration.di_payment.PaymentID,
        card_id:        migration.card.id,
        platform_id:    migration.platform.id,
        institution_id: migration.institution.id,
        cde_id:         migration.di_payment.uniqueid,
        short_id:       migration.di_payment.shortid,
        flag_test:      migration.di_payment.testtrans,
        flag_pos:       migration.di_payment.pos_trans,
        flag_fee:       migration.di_payment.ct,
        flag_secure:    migration.di_payment.secure,
        time_created:   migration.di_payment.restimestamp,
        time_captured:  migration.di_payment.req_capture_time,
        time_refunded:  migration.di_payment.req_refund_time,
        time_released:  migration.di_payment.req_delete_time
      }).save().then(payment => _.set(migration, "payment", payment))
    )
    .map((migration: iPaymentMigrationObject) => {
      return Database.namespace("aurora_payments").query("SELECT * FROM `02_paymentcapture` WHERE `PaymentID` = ? AND NOT (`req_timestamp` = 0 AND `captured` != 0)", migration.payment.old_id)
      .map((di_action: iYourpayPaymentActionObject) => {
        let new_action;
        const base = {payment_id: migration.payment.id, old_id: di_action.ActionID, time_created: di_action.req_timestamp};
        if (di_action.captured > 1 || di_action.captured < 0 || di_action.capture_state === "NOK") {
          if (!migration[<string>_.last(PaymentFailure.__type.split("/"))]) { migration[<string>_.last(PaymentFailure.__type.split("/"))] = {}; }
          new_action = new PaymentFailure(_.merge({amount: di_action.amount, code: di_action.captured, message: di_action.capture_reason}, base)).save();
        }
        else if (di_action.handlingtype === "capture") {
          if (!migration.failure) { migration[<string>_.last(PaymentFailure.__type.split("/"))] = {}; }
          new_action = new PaymentCapture(_.merge({amount: di_action.amount, flag_processed: di_action.captured, date_id: di_action.dateid}, base)).save();
        }
        else if (di_action.handlingtype === "refund" && di_action.amount > 0) {
          if (!migration[<string>_.last(PaymentRefund.__type.split("/"))]) { migration[<string>_.last(PaymentRefund.__type.split("/"))] = {}; }
          new_action = new PaymentRefund(_.merge({amount: di_action.amount, flag_processed: di_action.captured}, base)).save();
        }
        else {
          if (!migration[<string>_.last(PaymentRelease.__type.split("/"))]) { migration[<string>_.last(PaymentRelease.__type.split("/"))] = {}; }
          new_action = new PaymentRelease(_.merge({flag_processed: di_action.captured}, base)).save();
        }
        return new_action.then(res => migration[<string>_.last(res.constructor.__type.split("/"))][di_action.ActionID] = res);
      })
      .then(() => migration);
    })
    .map((migration: iPaymentMigrationObject) => {
      return Promise.map(_.filter(migration.capture), capture => {
        return Database.namespace("aurora_customer").query("SELECT `daily_percentage` FROM `merchant_transfer_accounts_daily_overview` WHERE `dateid` = ?", (<any>capture).date_id)
        .then(res => new PaymentFee({
          amount:       capture.amount * (res.daily_percentage || 225) / 10000,
          percentage:   (res.daily_percentage || 225) / 10000,
          old_id:       capture.old_id,
          payment_id:   migration.payment.id,
          time_created: capture.time_created
        }).save());
      })
      .then(() => migration);
    })
    .map((migration: iPaymentMigrationObject) => migration.payment.toObject());
  }
  
  // public static migrate(merchant: Merchant, payment?: Payment) {
  //   const platforms = {}, subscriptions = {}, institutions = {}, cards = {}, payments = {};
  //   const sql = payment && payment.exists
  //               ? Database.parse("SELECT * FROM `02_payments` WHERE `merchantnumber` IN (?) AND `PaymentID` = ? LIMIT 1", [[merchant.old_id], payment.old_id])
  //               : Database.parse("SELECT * FROM `02_payments` WHERE `merchantnumber` IN (?) LIMIT 3", [[merchant.old_id]]);
  //   return Database.namespace("aurora_payments").query(sql)
  //   .then((di_payments: iYourpayPaymentObject[]) => {
  //     return Promise.map(di_payments, di_payment => {
  //
  //       const promises = {};
  //
  //       if (di_payment.platform.match("/^viabill$/i")) { di_payment.payment_institute = 7; }
  //       if (di_payment.platform.match("/^resurs(?:bank)?$/i")) { di_payment.payment_institute = 8; }
  //       if (di_payment.platform.match("/^quickpay$/i")) { di_payment.payment_institute = 9; }
  //       const institution = {old_id: di_payment.payment_institute || 0};
  //       if (!institutions[di_payment.payment_institute || 0]) { (institutions[di_payment.payment_institute || 0] = new Institution(institution).validate()).then(res => res.exists ? res : res.save()); }
  //       promises["institution"] = new Promise((resolve, reject) => institutions[di_payment.payment_institute || 0].then(res => resolve(res), err => reject(err)));
  //
  //       di_payment.platform = di_payment.platform || "Unknown";
  //       di_payment.platform_domain = di_payment.platform_domain || "Unknown";
  //       di_payment.version = di_payment.version || "0";
  //       const platform_id = `${di_payment.platform}::${di_payment.platform_domain}::${di_payment.version}`;
  //       const platform = {name: di_payment.platform, domain: di_payment.platform_domain, version: di_payment.version};
  //       if (!platforms[platform_id]) { (platforms[platform_id] = new Platform(platform).validate()).then(res => res.exists ? res : res.save()); }
  //       promises["platform"] = new Promise((resolve, reject) => platforms[platform_id].then(res => resolve(res), err => reject(err)));
  //
  //       promises["card"] = new Promise((resolve, reject) =>
  //         Database.namespace("master").query("SELECT * FROM `card/type` WHERE LOCATE(`pattern`, ?) = 1 ORDER BY LENGTH(`pattern`) DESC LIMIT 1", di_payment.cardno.substring(0, 6))
  //         .then(res => {
  //           if (!res[0]) { return reject(res); }
  //           const card_id = `${di_payment.cardholder}::${di_payment.cardno}::${di_payment.card_country}`;
  //           const card = {type_id: res[0].id, name: di_payment.cardholder, number: di_payment.cardno, country_id: di_payment.card_country};
  //           (cards[card_id] || (cards[card_id] = new Card(card).save())).then(r => resolve(r), e => reject(e));
  //         })
  //         .catch(err => reject(err))
  //       );
  //
  //       Promise.parallel(promises)
  //       .then(res =>
  //         payments[di_payment.PaymentID] = new Payment({
  //           amount:         di_payment.amount,
  //           currency_id:    di_payment.Currency,
  //           order_id:       di_payment.orderID,
  //           old_id:         di_payment.PaymentID,
  //           card_id:        res.card.id,
  //           platform_id:    res.platform.id,
  //           institution_id: res.institution.id,
  //           cde_id:         di_payment.uniqueid,
  //           short_id:       di_payment.shortid,
  //           flag_test:      di_payment.testtrans,
  //           flag_pos:       di_payment.pos_trans,
  //           flag_fee:       di_payment.ct,
  //           flag_secure:    di_payment.secure,
  //           time_captured:  di_payment.req_capture_time,
  //           time_refunded:  di_payment.req_refund_time,
  //           time_released:  di_payment.req_delete_time
  //         })
  //         .validate().then(payment => _.set(payment, "time_created", di_payment.restimestamp || Date.now()).save())
  //       )
  //       .then(payment => Database.namespace("aurora_payments").query("SELECT * FROM `02_paymentcapture` WHERE `PaymentID` = ?", payment.old_id).map(di_action => {
  //         let action, object = {payment_id: payment.id, old_id: di_action.ActionID};
  //
  //         if (di_action.captured > 1) {
  //           action = new PaymentFailure(_.merge(object, {amount: di_action.amount, code: di_action.captured, message: di_action.captured})).validate();
  //         }
  //         else if (di_action.handlingtype === "capture") {
  //           action = new PaymentCapture(_.merge(object, {amount: di_action.amount, flag_processed: di_action.captured})).validate();
  //         }
  //         else if (di_action.handlingtype === "refund" && di_action.amount > 0) {
  //           action = new PaymentRefund(_.merge(object, {amount: di_action.amount, flag_processed: di_action.captured})).validate();
  //         }
  //         else {
  //           action = new PaymentRelease(_.merge(object, {amount: di_action.amount, code: di_action.captured, message: di_action.captured})).validate();
  //         }
  //
  //         return action.then(res => _.set(res, "time_created", di_action.req_timestamp || Date.now()).save());
  //       }))
  //       .then(res => _.filter(res, action => action instanceof PaymentCapture).map(action => {
  //         console.log(action);
  //         /* Do the fee thing here */
  //         return action;
  //       }))
  //       .then(() => payments)
  //       .catch(err => console.error(err));
  //     });
  //   });
  // }
  
}

Application.addRoute(env.subdomains.api, Payment.__type, "/migrate", "POST", [
  (request, response) => {
    let merchant_lookup;
    const time_started = Date.now();
    if (!request.body.merchant_token) { return response.status(400).json(new Response.JSON(400, "merchant_token", {merchant_token: request.body.merchant_token || ""}, time_started)); }
    Merchant.getMerchantId(request.body.merchant_token)
    .then(lookup => new Merchant({old_id: lookup.id}).validate().then(merchant => (merchant_lookup = lookup) && merchant.exists ? merchant : Merchant.migrate(lookup)))
    .then(merchant => request.body.id ? new Payment({old_id: request.body.id}).validate().then(res => Payment.migrate(merchant, res)) : Payment.migrate(merchant))
    .then(payments => response.json(new Response.JSON(200, "any", payments, time_started)))
    .catch(err => console.error(err) || response.status(400).json(new Response.JSON(400, "any", err, time_started)));
  }
]);

interface iPaymentMigrationObject {
  card?: Card
  institution?: Institution
  platform?: Platform
  payment?: iPaymentObject
  di_payment?: iYourpayPaymentObject
  di_actions?: iYourpayPaymentActionObject
  failure?: {[key: string]: PaymentFailure}
  fee?: {[key: string]: PaymentFee}
  capture?: {[key: string]: PaymentCapture}
  refund?: {[key: string]: PaymentRefund}
  release?: {[key: string]: PaymentRelease}
}

interface iPaymentObject {
  [key: string]: any
  
  id?: string | Buffer
  amount?: number;
  currency_id?: string;
  order_id?: string;
  old_id?: number;
  card_id?: string | Buffer;
  platform_id?: string | Buffer;
  institution_id?: string | Buffer;
  cde_id?: string;
  short_id?: string;
  flag_test?: boolean | number;
  flag_pos?: boolean | number;
  flag_fee?: boolean | number;
  flag_secure?: boolean | number;
  time_created?: number;
  time_updated?: number;
  time_captured?: number;
  time_refunded?: number;
  time_released?: number;
}


