import * as _ from "lodash";
import * as path from "path";

import {init_chain} from "../../app";
import Element from "../../classes/Element";
import {HTTPService} from "../../modules/HTTPService";

export const documentation_types = {
  element:        "documentation/element",
  endpoint:       "documentation/endpoint",
  endpoint_field: "documentation/endpoint/field",
  field:          "documentation/field"
};

export namespace Documentation {
  
  const library: {[category: string]: DocumentationCategory} = {};
  
  export function category(name: string) {
    return _.get(library, name, library[name] = new DocumentationCategory());
  }
  
  class DocumentationCategory {
    
    private pages: {[key: string]: DocumentationPage} = {}
    
    constructor() {}
    
    public page(name: string) {
      return _.get(this.pages, name, this.pages[name] = new DocumentationPage());
    }
    
  }
  
  class DocumentationPage {
  
  }
  
}

init_chain.addPromise("dbs", resolve => {
  
  const api = Documentation.category("api");
  
  _.each(Element.types, (type: typeof Element) => api.page(type.__type));
  
  resolve();
  
});

init_chain.addPromise("route", resolve => {
  
  HTTPService.subdomain("docs", path.resolve(__dirname, "./public")).router("/").endpoint("GET", "*", (request, response) => {
    response.sendFile(path.resolve(__dirname, "./public/index.html"));
  });
  
  resolve();
  
});

