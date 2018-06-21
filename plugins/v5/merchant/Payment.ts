import * as Resources from "../../../classes/Resource";
import * as Application from "../../../modules/Application";
import * as Response from "../../../modules/Response";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";
import {env} from "../../../app";
import * as rp from "request-promise";

export const type = "card";

export const options: Tables.iTableOptions = {
  coextensive: true
};
export const columns: Tables.iTableColumns = {
  type_id:      {type: "binary(16)", required: true, protected: true},
  name:         {type: "varchar(64)", required: true, protected: true, unique_index: ["card"]},
  number:       {type: "varchar(16)", required: true, protected: true, unique_index: ["card"]},
  country_id:   {type: "varchar(3)", required: true, protected: true},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class Payment extends Resources.Constructor {
  
  public static readonly __type: string = "payment";
  public static readonly __table: Table = new Table(Payment, options, columns);
  
  public type_id: string;
  public name: string;
  public number: string;
  public country_id: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iPaymentObject) {
    super(object);
  }
  
}

interface iPaymentObject {
  id?: string | Buffer
  type_id: string | Buffer
  name: string
  number: string
  country_id: string
  time_created?: number
  time_updated?: number
}

Application.addRoute(env.subdomains.api, Payment.__type, "/migrate", "POST", [
  (request, response, next) => {
    const time_started = Date.now();
    if (!request.body.merchant_token) { return response.status(400).json(new Response.JSON(400, "merchant_token", {merchant_token: request.body.merchant_token || ""}, time_started)); }
    console.log(request.body.merchant_token)
    return rp({method: "POST", uri: "https://webservice.yourpay.dk/v4.3/payment_list", form: {merchant_token: request.body.merchant_token, listtype: "1"}, json: true}).then(res => {
      console.log(res);
      response.status(200).json(new Response.JSON(200, "any", res, time_started));
    })
    .catch(err => console.log(err) || response.status(400).json(new Response.JSON(400, "merchant_token", {merchant_token: request.body.merchant_token || ""}, time_started)));
  },
  (request, response) => console.log("t", response.locals) || response.status(response.locals.json.code).send(response.locals.json)
]);