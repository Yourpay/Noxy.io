import PromiseQueue from "../../classes/PromiseQueue";
import Promise from "aigle";
import {resource_queue} from "../../init/resource";
import {publicize_queue} from "../../init/publicize";
import {db_queue} from "../../init/db";
import CardType from "./master/CardType";
import PSP from "./master/PSP";
import * as Include from "../../modules/Include";
import * as path from "path";

export const databases = {customer: "aurora_customer", payments: "aurora_payments"};

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
      "Resursbank":                            ["resurs"],
      "Viabill":                               ["viabill"],
      "SMSPay":                                ["smspay"],
      "MobilePay":                             ["mobilepay"]
    };
  
    Promise.map(preset, (patterns, type) => Promise.map(patterns, pattern => new CardType({name: type, pattern: pattern}).save()))
    .then(res => resolve(res))
    .catch(err => reject(err));
  });
  
  v5_queue.execute()
  .then(res => resolve(res))
  .catch(err => reject(err));
  
});

publicize_queue.promise("setup", (resolve, reject) => {
  
  resolve();
  
});
