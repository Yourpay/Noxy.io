import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {
  junction: true
};
const columns: Tables.iTableColumns = {
  merchant_id: {type: "binary(16)", primary_key: true, required: true, protected: true, index: ["merchant_id"], relations: {table: "merchant"}},
  user_id:     {type: "binary(16)", primary_key: true, required: true, protected: true, index: ["user_id"], relations: {table: "user"}}
};

@Resource.implement<Resource.iResource>()
export default class MerchantUser extends Resource.Constructor {
  
  public static readonly __type: string = "merchant/user";
  public static readonly __table: Table = new Table(MerchantUser, options, columns);
  
  public merchant_id: Buffer;
  public user_id: Buffer;
  
  constructor(object?: iMerchantUserObject) {
    super(object);
    this.merchant_id = typeof object.merchant_id === "string" ? Resource.Constructor.bufferFromUuid(object.merchant_id) : object.merchant_id;
    this.user_id = typeof object.user_id === "string" ? Resource.Constructor.bufferFromUuid(object.user_id) : object.user_id;
  }
  
}

interface iMerchantUserObject {
  merchant_id?: string | Buffer
  user_id?: string | Buffer
}

