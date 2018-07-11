import Promise from "aigle";
import * as he from "he";
import * as _ from "lodash";
import {env} from "../../../app";
import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import {publicize_queue} from "../../../init/publicize";
import * as Application from "../../../modules/Application";
import * as Database from "../../../modules/Database";
import * as Responses from "../../../modules/Response";
import * as Response from "../../../modules/Response";
import iYourpayPaymentActionObject from "../interfaces/iYourpayPaymentActionObject";
import iYourpayPaymentObject from "../interfaces/iYourpayPaymentObject";
import Card from "./Card";
import CardType from "./CardType";
import Institution from "./Institution";
import Merchant from "./Merchant";
import MerchantUser from "./MerchantUser";
import PaymentCapture from "./PaymentCapture";
import PaymentFailure from "./PaymentFailure";
import PaymentFee from "./PaymentFee";
import PaymentRefund from "./PaymentRefund";
import PaymentRelease from "./PaymentRelease";
import PaymentSubscription from "./PaymentSubscription";
import Platform from "./Platform";
import PSP from "./PSP";
import Subscription from "./Subscription";

export const options: Tables.iTableOptions = {};
export const columns: Tables.iTableColumns = {
  amount:         {type: "int(11)", protected: true, required: true},
  currency_id:    {type: "varchar(3)", protected: true, required: true, default: 208},
  order_id:       {type: "varchar(64)", protected: true, required: true},
  old_id:         {type: "int(11)", required: true, protected: true, unique_index: ["old_id"]},
  merchant_id:    {type: "binary(16)", required: true, protected: true, index: ["merchant"], relations: {table: "merchant"}},
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
  time_captured:  Table.generateTimeColumn(),
  time_refunded:  Table.generateTimeColumn(),
  time_released:  Table.generateTimeColumn(),
  time_updated:   Table.generateTimeColumn(null, true)
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
  public time_captured: number;
  public time_refunded: number;
  public time_released: number;
  public time_updated: number;
  
  constructor(object?: iPaymentObject) {
    super(object);
  }
  
  public static migrate(merchant_ids?: number[], payment?: Payment, start = 0, limit = 1000) {
    const subscriptions = {}, cards = {}, institutions = {}, platforms = {}, merchants = {};
    let sql = ["SELECT * FROM `02_payments`"], where = [];
    if (payment && payment.exists) { where.push({sql: "`PaymentID` = ?", value: payment.id}); }
    if (merchant_ids) { where.push({sql: "`merchantnumber` IN (?)", value: [merchant_ids]}); }
    if (_.size(where) > 0) {
      sql.push("WHERE");
      _.each(where, w => sql.push(Database.parse(w.sql, w.value)));
    }
    sql.push(`LIMIT ${limit} OFFSET ${start}`);
    return Database.namespace("aurora_payments").query(_.join(sql, " ")).map((di_payment: iYourpayPaymentObject) => {
      const subscription_id = di_payment.connected_subscriptioncode;
      if (!subscription_id) { return {di_payment: di_payment}; }
      if (subscriptions[subscription_id]) { return {di_payment: _.merge(di_payment, _.pick(subscriptions[subscription_id], ["cardno", "cardholder", "card_country", "shortid_ccrg"]))}; }
      return subscriptions[subscription_id] = Database.namespace("aurora_payments").query("SELECT * FROM `02_payments` WHERE shortid_ccrg = ? LIMIT 1", [subscription_id])
      .then(subscription_payment => ({di_payment: _.merge(di_payment, _.pick(subscription_payment, ["cardno", "cardholder", "card_country"]))}));
    })
    .map((migration: iPaymentMigrationObject) => {
      migration.di_payment.cardno = migration.di_payment.cardno.replace(/\s/g, "").match(/\d{6}x{6}\d{4}/gi) ? migration.di_payment.cardno : "000000XXXXXX0000";
      migration.di_payment.cardholder = !migration.di_payment.cardholder.match(/(?: *\d *){16,}|^\s*$/) ? he.decode(migration.di_payment.cardholder) : "Unknown";
      if (migration.di_payment.cardholder.match(/^[\u00C0-\u1FFF\u2C00-\uD7FF\w\s]+$/)) {
        migration.di_payment.cardholder = _.toLower(_.trim(migration.di_payment.cardholder, " .,")).replace(/^[\u00C0-\u1FFF\u2C00-\uD7FF\w]|\s[\u00C0-\u1FFF\u2C00-\uD7FF\w]/g, l => l.toUpperCase());
      }
      return Database.namespace("master").query("SELECT * FROM `card/type` WHERE LOCATE(`pattern`, ?) = 1 ORDER BY LENGTH(`pattern`) DESC LIMIT 1", migration.di_payment.cardno.substring(0, 6))
      .then(card_types => {
        if (!card_types[0]) { throw new Error("Could not validate card type"); }
        const card_id = `${_.toLower(migration.di_payment.cardholder)}::${migration.di_payment.cardno}::${migration.di_payment.card_country}`;
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
    .map((migration: iPaymentMigrationObject) => {
      if (!merchants[migration.di_payment.merchantnumber]) {
        merchants[migration.di_payment.merchantnumber] = new Merchant({old_id: migration.di_payment.merchantnumber}).validate()
        .then(merchant => merchant.exists ? merchant : Merchant.getMerchantLookup(migration.di_payment.merchantnumber)
          .then(lookup => Merchant.migrate(lookup)
            .then(() => new Merchant({old_id: lookup.id}).validate())
          )
        );
      }
      return merchants[migration.di_payment.merchantnumber].then(merchant => _.set(migration, "merchant", merchant));
    })
    .map((migration: iPaymentMigrationObject) =>
      new Payment({
        merchant_id:    migration.merchant.id,
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
    .map((migration: iPaymentMigrationObject) =>
      !migration.di_payment.shortid_ccrg ? migration : new Subscription({old_id: migration.di_payment.shortid_ccrg}).save()
      .then(subscription =>
        new PaymentSubscription({payment_id: migration.payment.id, subscription_id: (migration.subscription = subscription).id}).save()
        .then(payment_subscription => _.set(migration, "payment_subscription", payment_subscription))
      )
    )
    .map((migration: iPaymentMigrationObject) =>
      Database.namespace("aurora_payments").query("SELECT * FROM `02_paymentcapture` WHERE `PaymentID` = ? AND NOT (`req_timestamp` = 0 AND `captured` != 0)", migration.payment.old_id)
      .map((di_action: iYourpayPaymentActionObject) => {
        let new_action;
        const base = {payment_id: migration.payment.id, old_id: di_action.ActionID, time_created: di_action.req_timestamp};
        if (di_action.captured > 1 || di_action.captured < 0 || di_action.capture_state === "NOK") {
          if (!migration[PaymentFailure.__type]) { migration[PaymentFailure.__type] = {}; }
          new_action = new PaymentFailure(_.merge({amount: di_action.amount, code: di_action.captured, message: di_action.capture_reason}, base)).save();
        }
        else if (di_action.handlingtype === "capture") {
          if (!migration[PaymentCapture.__type]) { migration[PaymentCapture.__type] = {}; }
          new_action = new PaymentCapture(_.merge({amount: di_action.amount, flag_processed: di_action.captured, date_id: di_action.dateid}, base)).save();
        }
        else if (di_action.handlingtype === "refund" && di_action.amount > 0) {
          if (!migration[PaymentRefund.__type]) { migration[PaymentRefund.__type] = {}; }
          new_action = new PaymentRefund(_.merge({amount: di_action.amount, flag_processed: di_action.captured}, base)).save();
        }
        else {
          if (!migration[PaymentRelease.__type]) { migration[PaymentRelease.__type] = {}; }
          new_action = new PaymentRelease(_.merge({flag_processed: di_action.captured}, base)).save();
        }
        return new_action.then(res => migration[res.constructor.__type][di_action.ActionID] = res);
      })
      .then(() => migration))
    .map((migration: iPaymentMigrationObject) =>
      Promise.map(_.filter(migration.capture, capture => (<any>capture).date_id > 0), capture =>
        Database.namespace("aurora_customer").query("SELECT `daily_percentage` FROM `merchant_transfer_accounts_daily_overview` WHERE `dateid` = ?", (<any>capture).date_id)
        .then(res => new PaymentFee({
          amount:       capture.amount * (res.daily_percentage || 225) / 10000,
          percentage:   (res.daily_percentage || 225) / 10000,
          old_id:       capture.old_id,
          payment_id:   migration.payment.id,
          time_created: capture.time_created
        }).save()))
      .then(() => migration))
    .map((migration: iPaymentMigrationObject) => migration.payment.toObject())
    .catch(err => console.log(err) || err);
  }
  
}

publicize_queue.promise("setup", resolve => {
  Application.addRoute(env.subdomains.api, Payment.__type, "/migrate", "POST", [
    (request, response) => {
      let merchant_lookup, merchant, ids;
      const start = request.body.start;
      const limit = request.body.limit;
      const time_started = Date.now();
      if (!request.body.merchant_token) { return response.status(400).json(new Response.JSON(400, "merchant_token", {merchant_token: request.body.merchant_token || ""}, time_started)); }
      Merchant.getMerchantLookup(request.body.merchant_token)
      .then(lookup => (merchant = new Merchant({old_id: lookup.id})).validate().then(merchant => (merchant_lookup = lookup) && merchant.exists ? merchant : Merchant.migrate(lookup)))
      .then(() => Merchant.getDomains(merchant_lookup).then(lookups => ids = _.filter(_.reduce(lookups, (result, lookup) => result.concat(lookup.id, lookup.production_id), []))))
      .then(() => request.body.id ? new Payment({old_id: request.body.id}).validate().then(payment => Payment.migrate(ids, payment, start, limit)) : Payment.migrate(ids, null, start, limit))
      .then(payments => response.json(new Response.JSON(200, "any", payments, time_started)))
      .catch(err => response.status(400).json(new Response.JSON(400, "any", err, time_started)));
    }
  ]);
  
  Application.addRoute(env.subdomains.api, Payment.__type, "/", "GET", [
    (request, response) => {
      
      let payments_promise;
      const start = request.query.start > 0 ? request.query.start : 0;
      const limit = request.query.limit > 0 && request.query.limit < 100 ? request.query.limit : 100;
      const type_map = {
        "new":     0, "0": 0,
        "capture": 1, "captured": 1, "1": 1,
        "refund":  2, "refunded": 2, "2": 2,
        "release": 3, "released": 3, "3": 3
      };
      const type = {
        0: " AND time_captured = 0 AND time_released = 0 ",
        1: " AND time_captured > 0 AND time_refunded = 0 ",
        2: " AND time_refunded > 0 ",
        3: " AND time_released = 0 "
      };
      const where_type = type[_.get(type_map, request.query.type, "")] || "";
      const collection = {institution_id: Institution, platform_id: Platform, merchant_id: Merchant, card_id: Card};
      const constants = {};
      
      if (request.query.merchant_id) {
        payments_promise = new MerchantUser({merchant_id: request.query.merchant_id, user_id: response.locals.user.id}).validate()
        .then(merchant_user => merchant_user.exists ? new Merchant({id: merchant_user.merchant_id}).validate() : Promise.reject(new Responses.JSON(403, "merchant_id", {merchant_id: merchant_user.merchant_id})))
        .then(merchant => merchant.exists ? Promise.resolve([merchant]) : Promise.reject(new Responses.JSON(400, "merchant_id", {merchant_id: merchant.id}))
        );
      }
      else {
        payments_promise = Database.namespace("master").query(MerchantUser.__table.selectSQL(0, 1000, {user_id: response.locals.user.id}))
        .map((merchant_user: MerchantUser) => new Merchant({id: merchant_user.merchant_id}).validate());
      }
      return payments_promise
      .then(res => Database.namespace("master").query("SELECT * FROM ?? WHERE `merchant_id` IN (?) " + where_type + " LIMIT ? OFFSET ?", [Payment.__type, _.map(res, "id"), limit, start]))
      .map(payment => new Payment(payment).toObject())
      .map(payment_object => {
        return Promise.map(collection, (resource: typeof Resource.Constructor, id) => {
          const key = Resource.Constructor.uuidFromBuffer(payment_object[id]);
          if (!_.get(constants, [resource.__type, key])) { _.set(constants, [resource.__type, key], new resource({id: payment_object[id]}).validate()); }
          return _.get(constants, [resource.__type, key]).then(result => _.set(payment_object, resource.__type, result.toObject()));
        })
        .then(res => _.omit(payment_object, _.keys(collection)));
      })
      .map(payment_object => {
        const key = Resource.Constructor.uuidFromBuffer(payment_object.card.type_id);
        if (!_.get(constants, [CardType.__type, key])) { _.set(constants, [CardType.__type, key], new CardType({id: payment_object.card.type_id}).validate()); }
        return _.get(constants, [CardType.__type, key]).then(result => delete payment_object.card.type_id && _.set(payment_object, [Card.__type, CardType.__type], result.toObject()));
      })
      .map(payment_object => {
        const key = Resource.Constructor.uuidFromBuffer(payment_object.merchant.psp_id);
        if (!_.get(constants, [PSP.__type, key])) { _.set(constants, [PSP.__type, key], new PSP({id: payment_object.merchant.psp_id}).validate()); }
        return _.get(constants, [PSP.__type, key]).then(result => delete payment_object.merchant.psp_id && _.set(payment_object, [Merchant.__type, PSP.__type], result.toObject()));
      })
      .then(res => new Responses.JSON(200, "any", res))
      .catch(err => err instanceof Responses.JSON ? err : new Responses.JSON(500, "any", err))
      .then((res: Responses.JSON) => response.status(res.code).json(res));
    }
  ]);
  
  resolve();
  
});

interface iPaymentMigrationObject {
  merchant?: Merchant
  card?: Card
  institution?: Institution
  platform?: Platform
  payment?: Payment
  subscription?: Subscription
  payment_subscription?: PaymentSubscription
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


