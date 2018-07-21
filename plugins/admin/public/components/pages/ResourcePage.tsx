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
    if (resource && this.state.resource !== resource) {
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
    console.log(store.getState());
    return (
      <div id="resource-list">
        <div className="resource-header">
          {_.map(_.get(store.getState(), ["list", "resource", this.state.resource], []), (header, i) => (
            <div className="resource-header-column" key={"header-" + i}>{header}</div>
          ))}
        </div>
        {_.map(_.get(store.getState(), ["resource", this.state.resource], []), (resource, i) => (
          <div className="resource-row" key={"row-" + i}>
            {_.map(_.get(store.getState(), ["list", "resource", this.state.resource], []), (header, j) => (
              <div className="resource-row-column" key={"row-" + i + "-column-" + j}>{JSON.stringify(resource[header])}</div>
            ))}
          </div>
        ))}
      </div>
    
    );
  }
}
