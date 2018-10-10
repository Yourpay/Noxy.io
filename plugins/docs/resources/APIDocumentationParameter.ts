import {tNonFnPropsOptional} from "../../../interfaces/iAuxiliary";
import {iTableDefinition} from "../../../interfaces/iResource";
import * as Resource from "../../../modules/Resource";
import {eAPIDocumentationType} from "../init";

const definition: iTableDefinition = {
  name:         {type: "varchar", length: 32, required: true},
  key:          {type: "varchar", length: 32, required: true, protected: true, unique_index: "key"},
  description:  {type: "text", default: ""},
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class APIDocumentationParameter extends Resource.Constructor {
  
  public name: string;
  public key: string;
  public description: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(initializer: tNonFnPropsOptional<APIDocumentationParameter> = {}) {
    super(initializer);
    if (!initializer.key) { this.key = Resource.toKey(initializer.name); }
    if (!initializer.name) { this.name = initializer.key; }
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
  }
  
}

Resource<eAPIDocumentationType>(eAPIDocumentationType.API_DOCUMENTATION_PARAMETER, APIDocumentationParameter, definition, options);
