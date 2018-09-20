import {cResource, eResourceType, iResource} from "../interfaces/iResource2";
import * as Resource from "../modules/Resource2";

class Test extends Resource.Constructor {

  public id: Buffer;
  public uuid: string;
  public validated: boolean;
  public exists: boolean;
  
  constructor(initializer?) {
    super(initializer);
  }

}

Resource<eResourceType, cResource>(eResourceType.ROLE, Test);
