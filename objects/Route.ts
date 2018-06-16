import * as _ from "lodash";
import Element from "../classes/Element";

export default class Route extends Element {
  
  public method: string;
  public path: string;
  public subdomain: string;
  public flag_active: boolean;
  
  public static __type = "route";
  
  public static __fields = _.assign({},
    Element.__fields,
    {
      method:      {type: "enum('GET','POST','PUT','DELETE')", required: true},
      path:        {type: "varchar(64)", required: true},
      subdomain:   {type: "varchar(64)", required: true},
      flag_active: {type: "tinyint(1)", default: "0"}
    },
    Element.generateTimeFields()
  );
  
  public static __indexes = _.assign({},
    Element.__indexes,
    {
      unique_key: {
        path: ["method", "path", "subdomain"]
      }
    },
    Element.generateTimeIndexes()
  );
  
  public static __relations = _.assign({},
    Element.__relations
  );
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
};