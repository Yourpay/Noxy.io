import * as _ from "lodash";
import {tNonFnPropsOptional} from "../../../interfaces/iAuxiliary";
import * as Resource from "../../../modules/Resource";
import {eDocumentationType} from "../init";

const definition = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: "key"},
  description:  {type: "text", default: ""},
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class Documentation extends Resource.Constructor {
  
  public name: string;
  public key: string;
  public description: string;
  public time_created: number;
  public time_updated: number;
  
  constructor(initializer: tNonFnPropsOptional<Documentation> = {}) {
    super(initializer);
    if (!initializer.key) { this.key = _.snakeCase(_.deburr(initializer.name)); }
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
  }
  
}

Resource<eDocumentationType>(eDocumentationType.DOCUMENTATION, Documentation, definition, options);
