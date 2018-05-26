import * as _ from "lodash";
import Element from "../../classes/Element";
import {documentation_types} from "./init";

export default class DocsElement extends Element {
  
  public static __type = documentation_types.element;
  public static __fields = _.assign({},
    Element.__fields,
    {
      name: {type: "varchar(32)", required: true, protected: true},
      key:  {type: "varchar(32)", required: true, protected: true, onCreate: $this => Element.stringToKey($this.name)}
    }
  );
  public static __indexes = _.assign({},
    {
      unique_key: {
        name: ["name"],
        key:  ["key"]
      }
    }
  );
  public static __relations = _.assign({});
  public name: string;
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};