import {eResourceType, tResourceInitializer} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";

class Test extends Resource.Constructor {
  
  public test: string;
  
  constructor(initializer?: tResourceInitializer<Test>) {
    super(initializer);
    
  }
  
}

new Test({test: "", swag: ""});

Resource<eResourceType>(eResourceType.ROLE_USER, Test, {}, {});
