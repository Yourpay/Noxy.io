import {eResourceType, tResourceInitializer} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";

class Test extends Resource.Constructor {
  
  public test: string;
  
  constructor(initializer?: tResourceInitializer<Test>) {
    super(initializer);
    
  }
  
}

Resource<eResourceType>(eResourceType.ROLE_USER, Test, {}, {});

interface cResource {
  new(): iResource
  
  __id: string;
  __type: string;
  
  select(): InstanceType<cResource>
}

interface iResource {
  id: string
}

const Class: cResource = class Parent {
  
  public id: string;
  public static __id: string;
  public static __type: string;
  
  constructor() {
  
  }
  
  public save(): this {
    return this;
  }
  
  public static select(): InstanceType<typeof Parent> {
    return new this();
  }
  
};

class Child extends Class {
  
  public name: string;
  public swag: string;
  public static __name: string;
  
  constructor() {
    super();
  }
  
  public validate(): this {
    return this;
  }
  
  public static select() {
    return new this();
  }
  
}

Class.select().id;
Child.select();
Child.select().swag;