import * as Resources from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  payment_id:   {type: "binary(16)", required: true, protected: true, index: ["pattern"], relations: {table: "payment"}},
  old_id:       {type: "int(11)", required: true, protected: true},
  amount:       {type: "int(11)", required: true, protected: true},
  percentage:   {type: "decimal(5,4)", required: true, protected: true},
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class PaymentFee extends Resources.Constructor {
  
  public static readonly __type: string = "payment/fee";
  public static readonly __table: Table = new Table(PaymentFee, options, columns);
  
  public payment_id: Buffer;
  public old_id: number;
  public amount: number;
  public percentage: number;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iNewPaymentFeeObject | iCurrentPaymentFeeObject | iOldPaymentFeeObject) {
    super(object);
    this.time_created = Date.now();
  }
  
}

interface iNewPaymentFeeObject {
  percentage: number
  
  id?: string | Buffer
  amount: number
  payment_id: string | Buffer
  old_id: number
  
  [key: string]: any;
  time_created?: number
  time_updated?: number
}

interface iCurrentPaymentFeeObject {
  id: string | Buffer
  amount?: number
  percentage?: number
  payment_id?: string | Buffer
  old_id?: number
  
  [key: string]: any;
  time_created?: number
  time_updated?: number
}

interface iOldPaymentFeeObject {
  peid?: string | Buffer
  rcentage?: number
  amount?: number
  payment_id?: string | Buffer
  old_id: number
  time_updated?: number
}

time_created ? : number
  
  [key
:
string;
]:
any;

