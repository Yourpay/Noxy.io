import {cResource, eResourceType, tResourceInitializer} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";

class Test extends Resource.Constructor {
  
  public test: string;
  
  constructor(initializer?: tResourceInitializer<Test>) {
    super(initializer);
    
  }
  
}

Test.select();

new Test({test: "", swag: ""});

Resource<eResourceType, cResource>(eResourceType.ROLE, Test, {}, {});
