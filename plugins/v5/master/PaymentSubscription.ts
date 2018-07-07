import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

export const options: Tables.iTableOptions = {
  junction: true
};
export const columns: Tables.iTableColumns = {
  payment_id:      {type: "binary(16)", primary_key: true, protected: true, required: true, index: ["payment_id"], relations: {table: "payment"}},
  subscription_id: {type: "binary(16)", primary_key: true, protected: true, required: true, index: ["subscription_id"], relations: {table: "subscription"}}
};

@Resource.implement<Resource.iResource>()
export default class PaymentSubscription extends Resource.Constructor {
  
  public static readonly __type: string = "payment/subscription";
  public static readonly __table: Table = new Table(PaymentSubscription, options, columns);
  
  public payment_id: Buffer;
  public subscription_id: Buffer;
  
  constructor(object?: iPaymentSubscriptionObject) {
    super(object);
    this.payment_id = typeof object.payment_id === "string" ? Resource.Constructor.bufferFromUuid(object.payment_id) : object.payment_id;
    this.subscription_id = typeof object.subscription_id === "string" ? Resource.Constructor.bufferFromUuid(object.subscription_id) : object.subscription_id;
  }
  
}

interface iPaymentSubscriptionObject {
  payment_id?: string | Buffer
  subscription_id?: string | Buffer
}
