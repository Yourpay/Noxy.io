import PromiseQueue from "../../classes/PromiseQueue";
import {db_queue} from "../../init/defaults/db";
import * as Include from "../../modules/Include";
import * as path from "path";
import * as rp from "request-promise";
import {resource_queue} from "../../init/defaults/resources";

export const v5_queue = new PromiseQueue(["init"]);

v5_queue.promise("init", () => {
  
  db_queue.promise("register", (resolve, reject) => {
    Include({path: path.resolve(__dirname, "./master")})
    .then(res => resolve(res))
    .catch(err => reject(err));
  });
  
  resource_queue.promise("v5", (resolve, reject) => {
    const card_types = {
      
      "0":         "Unknown",
      "0604":      "Maestro",
      "300":       "Diner's Club International",
      "301":       "Diner's Club International",
      "302":       "Diner's Club International",
      "303":       "Diner's Club International",
      "304":       "Diner's Club International",
      "305":       "Diner's Club International",
      "309":       "Diner's Club International",
      "34":        "American Express",
      "35":        "JCB",
      "36":        "Diner's Club International",
      "37":        "American Express",
      "38":        "Diner's Club International",
      "39":        "Diner's Club International",
      "4":         "Visa",
      "4026":      "Visa Electron",
      "417500":    "Visa Electron",
      "4405":      "Visa Electron",
      "4508":      "Visa Electron",
      "4571":      "Visa Dankort",
      "4844":      "Visa Electron",
      "4913":      "Visa Electron",
      "4917":      "Visa Electron",
      "50":        "Mastercard",
      "5018":      "Maestro",
      "5019":      "Dankort",
      "5020":      "Maestro",
      "5038":      "Maestro",
      "51":        "Mastercard",
      "52":        "Mastercard",
      "53":        "Mastercard",
      "54":        "Mastercard / Diner's Club US & Canada",
      "55":        "Mastercard / Diner's Club US & Canada",
      "5612":      "Maestro",
      "5893":      "Maestro",
      "6011":      "Discover Card",
      "62":        "China UnionPay",
      "622":       "Discover Card",
      "6304":      "Laser/Maestro",
      "6390":      "Maestro",
      "644":       "Discover Card",
      "645":       "Discover Card",
      "646":       "Discover Card",
      "647":       "Discover Card",
      "648":       "Discover Card",
      "6706":      "Laser",
      "6709":      "Laser",
      "6759":      "Maestro",
      "6761":      "Maestro",
      "6762":      "Maestro",
      "6763":      "Maestro",
      "6771":      "Laser",
      "88":        "China UnionPay",
      "resurs":    "Resursbank",
      "viabill":   "Viabill",
      "smspay":    "SMSPay",
      "mobilepay": "MobilePay"
    };
    
    const institutions = {
      0:  "Unknown",
      1:  "SecureTrading",
      2:  "TrustPay",
      4:  "Credorax",
      7:  "Viabill",
      8:  "Resursbank",
      9:  "Quickpay",
      10: "MobilePay",
      25: "PayByGroup"
    };
    
    return rp({
      uri:  "https://webservice.yourpay.io/v4.3/customer_data",
      qs:   {merchant_token: "LZZsHoWHHZFMpKW7Nu8KzRaZcKHVmr"},
      json: true
    })
    .then(res => console.log(res) || resolve(res))
    .catch(err => reject(err));
  });
  
});

v5_queue.execute()
.then(() => console.log("v5_queue plugin loaded successfully."))
.catch(err => console.error("v5_queue plugin load failed with:", err));
