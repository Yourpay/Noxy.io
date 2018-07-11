import * as Resource from "../../../classes/Resource";
import * as Tables from "../../../classes/Table";
import Table from "../../../classes/Table";

const options: Tables.iTableOptions = {
  junction: true
};
const columns: Tables.iTableColumns = {
  merchant_id: {type: "binary(16)", primary_key: true, required: true, protected: true, index: ["merchant_id"], relations: {table: "merchant"}},
  master_id:   {type: "binary(16)", primary_key: true, required: true, protected: true, index: ["master_id"], relations: {table: "merchant"}},
  superior_id: {type: "binary(16)", primary_key: true, required: true, protected: true, index: ["superior_id"], relations: {table: "merchant"}}
};

@Resource.implement<Resource.iResource>()
export default class MerchantHierarchy extends Resource.Constructor {
  
  public static readonly __type: string = "merchant/hierarchy";
  public static readonly __table: Table = new Table(MerchantHierarchy, options, columns);
  
  public merchant_id: string | Buffer;
  public master_id: string | Buffer;
  public superior_id: string | Buffer;
  
  constructor(object?: iMerchantHierarchyObject) {
    super(object);
    this.merchant_id = typeof object.merchant_id === "string" ? Resource.Constructor.bufferFromUuid(object.merchant_id) : object.merchant_id;
    this.master_id = typeof object.master_id === "string" ? Resource.Constructor.bufferFromUuid(object.master_id) : object.master_id;
    this.superior_id = typeof object.superior_id === "string" ? Resource.Constructor.bufferFromUuid(object.superior_id) : object.superior_id;
  }
  
}

interface iMerchantHierarchyObject {
  merchant_id: string | Buffer
  master_id: string | Buffer
  superior_id: string | Buffer
}
