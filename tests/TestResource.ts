import {eResourceType} from "../interfaces/iResource2";
import * as Resource from "../modules/Resource2";

class Test extends Resource.Constructor {



}

Resource<eResourceType>(eResourceType.ROLE, Test)
