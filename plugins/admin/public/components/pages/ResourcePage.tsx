import axios from "axios";
import * as _ from "lodash";
import * as React from "react";
import {store} from "../../main";

export default class ResourceListPage extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
    this.state = {loading: false, resource: null, start: 0, limit: 10};
  }
  
  componentWillReceiveProps(props) {
    const resource = props.match.params.resource;
    if (this.state.resource !== resource) {
      this.setState({resource: resource, loading: true});
      axios({
        method:  "GET",
        baseURL: store.getState().api,
        url:     `/${resource.replace(/__/g, "/")}`,
        headers: {
          "Authorization": window.localStorage.jwt
        }
      })
      .then(res => {
        if (this.state.resource === resource) { this.setState({loading: false}); }
        store.dispatch({reducer: "resource", type: "update", value: {[resource]: res.data.content}});
      });
    }
  }
  
  render() {
    return (
      <div id="resource-list">
        {_.map(store.getState().resource[this.state.resource], (resource, key) => (
          <div className="resource" key={key}>
            
            {JSON.stringify(resource, null, 2)}
          </div>
        ))}
      
      </div>
    
    );
  }
}

class Resource extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
  }
  
}