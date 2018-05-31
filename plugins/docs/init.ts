import * as _ from "lodash";

import PromiseQueue from "../../classes/PromiseQueue";

export const documentation_queue = new PromiseQueue(["init"]);
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
    
    private pages: {[key: string]: DocumentationPage} = {};
    
    constructor() {}
    
    public page(name: string) {
      return _.get(this.pages, name, this.pages[name] = new DocumentationPage());
    }
    
  }
  
  class DocumentationPage {
    
    private objects: {[key: string]: DocumentationObject} = {};
    
    constructor() {}
    
    public object(name: string) {
      return _.get(this.objects, name, this.objects[name] = new DocumentationObject());
    }
    
  }
  
  class DocumentationObject {
    
    constructor() {}
    
  }
  
}
//
// init_queue.promise("init", resolve => {
//
//   resolve();
//
// });
//
// init_queue.promise("routing", resolve => {
//
//   documentation_chain.addPromise("init", resolve => {
//     Documentation.category("api");
//     resolve();
//   });
//   resolve();
// });
//
// init_chain.addPromise("pre-publicize", resolve => {
//
//   documentation_chain.cycle();
//
// });
//
// init_chain.addPromise("route", resolve => {
//
//   HTTPService.subdomain("docs", path.resolve(__dirname, "./public")).router("/").endpoint("GET", "*", (request, response) => {
//     response.sendFile(path.resolve(__dirname, "./public/index.html"));
//   });
//
//   resolve();
//
// });

