import Promise from "aigle";
import * as _ from "lodash";
import * as path from "path";
import {env} from "../../app";
import PromiseQueue from "../../classes/PromiseQueue";
import {db_queue} from "../../init/db";
import {resource_queue} from "../../init/resource";
import * as Database from "../../modules/Database";
import * as Include from "../../modules/Include";
import * as Responses from "../../modules/Response";
import CardType from "./master/CardType";
import Institution from "./master/Institution";
import PSP from "./master/PSP";

export const databases = {customer: "aurora_customer", payments: "aurora_payments"};

_.merge(Responses.codes,
  {
    400: {
      "merchant_token": "Could not validate merchant token.",
      "merchant_id":    "Merchant ID doesn't exist."
    },
    403: {
      "merchant_id": "Merchant ID doesn't exist or isn't attached to your user account."
    }
  }
);

db_queue.promise("connect", (resolve, reject) => {
  Promise.map(_.pick(env.databases, ["aurora_payments", "aurora_customer"]), (set, namespace) => Promise.map(Array.isArray(set) ? set : [set], database => Database.register(<string>namespace, database)))
  .then(res => resolve(res))
  .catch(err => reject(err));
});

db_queue.promise("register", (resolve, reject) => {
  Include({path: path.resolve(__dirname, "./master")})
  .then(res => resolve(res))
  .catch(err => reject(err));
});

resource_queue.promise("v5", (resolve, reject) => {
  
  const v5_queue = new PromiseQueue([]);
  
  v5_queue.promise("psp", (resolve, reject) => {
    Promise.all([
      new PSP({name: "Standard Customer", contact: "support@yourpay.io", old_id: 0, volume: 0, settlement_days: 14, percentage: 2.25}).save(),
      PSP.migrate()
    ])
    .then(res => resolve(res))
    .catch(err => reject(err));
  });
  
  v5_queue.promise("card_types", (resolve, reject) => {
    const preset = {
      "Unknown":                               ["0"],
      "American Express":                      ["34", "37"],
      "China UnionPay":                        ["62", "88"],
      "Dankort":                               ["5019"],
      "Diner's Club International":            ["300", "301", "302", "303", "304", "305", "309", "36", "38", "39"],
      "Discover Card":                         ["6011", "622", "644", "645", "646", "647", "648"],
      "JCB":                                   ["35"],
      "Laser":                                 ["6706", "6709", "6771"],
      "Laser / Maestro":                       ["6304"],
      "Mastercard":                            ["50", "51", "52", "53"],
      "Mastercard / Diner's Club US & Canada": ["54", "55"],
      "Maestro":                               ["0604", "5018", "5020", "5038", "5612", "5893", "6390", "6759", "6761", "6762", "6763"],
      "Visa":                                  ["4"],
      "Visa Dankort":                          ["4571"],
      "Visa Electron":                         ["4026", "417500", "4405", "4508", "4844", "4913", "4917"],
      "Resurs Bank":                           ["resursbank"],
      "ViaBill":                               ["viabill"],
      "SMSPay":                                ["smspay"],
      "MobilePay":                             ["mobilepay"]
    };
    
    Promise.map(preset, (patterns, type) => Promise.map(patterns, pattern => new CardType({name: type, pattern: pattern}).save()))
    .then(res => resolve(res))
    .catch(err => reject(err));
  });
  
  v5_queue.promise("institutions", (resolve, reject) => {
    const preset = {
      0:  "Unassigned",
      1:  "Secure Trading",
      2:  "TrustPay",
      4:  "Credorax",
      7:  "ViaBill",
      8:  "Resurs Bank",
      9:  "QuickPay",
      10: "MobilePay",
      25: "Pay By Group"
    };
    Promise.map(preset, (old_id, name) => new Institution({name: old_id, old_id: name}).save())
    .then(res => resolve(res))
    .catch(err => reject(err));
  });
  
  v5_queue.execute()
  .then(res => resolve(res))
  .catch(err => reject(err));
  
});
