import {cResource, eResourceType, tResourceInitializer} from "../interfaces/iResource2";
import * as Resource from "../modules/Resource2";

class Test extends Resource.Constructor {

  public test: string;
  
  constructor(initializer?: tResourceInitializer<Test>) {
    super(initializer);
    
  }

}

Test.select();

new Test({id: "" })

Resource<eResourceType, cResource>(eResourceType.ROLE, Test);
