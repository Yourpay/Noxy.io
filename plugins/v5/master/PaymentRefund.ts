import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  amount:         {type: "int(11)", required: true, protected: true},
  payment_id:     {type: "binary(16)", required: true, protected: true, index: ["pattern"], relations: {table: "payment"}},
  old_id:         {type: "int(11)", required: true, protected: true},
  flag_processed: {type: "tinyint(1)", required: true, protected: true},
  time_created:   Table.generateTimeColumn("time_created"),
  time_updated:   Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class PaymentRefund extends Resources.Constructor {
  
  public static readonly __type: string = "payment/refund";
  public static readonly __table: Table = new Table(PaymentRefund, options, columns);
  
  public payment_id: Buffer;
  public old_id: number;
  public amount: number;
  public flag_processed: boolean;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iNewPaymentRefundObject | iCurrentPaymentRefundObject | iOldPaymentRefundObject) {
    super(object);
    this.time_created = Date.now();
  }
  
}

interface iNewPaymentRefundObject {
  [key: string]: any
  
  id?: string | Buffer
  amount: number
  old_id: number
  flag_processed: number | boolean
  time_created?: number
  time_updated?: number
}

interface iCurrentPaymentRefundObject {
  id: string | Buffer
  amount?: number
  
  [key: string]: any
  
  old_id?: number
  flag_processed?: number | boolean
  time_created?: number
  time_updated?: number
}

interface iOldPaymentRefundObject {
  [key: string]: any;
  
  id?: string | Buffer
  amount?: number;
  old_id: number
  flag_processed?: number | boolean
  time_created?: number
  time_updated?: number
}


