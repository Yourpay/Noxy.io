import axios from "axios";
import * as _ from "lodash";
import * as React from "react";
import {Link, Route, Switch} from "react-router-dom";
import {store} from "../../main";
import ResourcePage from "./ResourcePage";

export default class ResourceListPage extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  componentDidMount() {
    console.log("Resource list mounted", this.state);
    this.setState({loading: true});
    axios({
      method:  "GET",
      baseURL: store.getState().api,
      url:     "/db",
      headers: {
        "Authorization": window.localStorage.jwt
      }
    })
    .then(res => {
      store.dispatch({reducer: "resource", type: "list", value: res.data.content});
      this.setState({loading: false});
    });
  }
  
  render() {
    console.log("Resource list rendered", this.state);
    return (
      <div>
        <h2>Resources</h2>
        <div id="resource-link">
          {_.map(store.getState().list.resource, (answer, key) => (<Link key={`resource-${key}`} to={`/resource/${key}`}>{key}</Link>))}
        </div>
        <div id="resource-info">
          <Switch>
            <Route path="/resource/:resource" component={ResourcePage}/>
            <Route component={ResourceInfoPage}/>
          </Switch>
        </div>
      
      </div>
    );
  }
}

class ResourceInfoPage extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div>
        <h2>Info</h2>
      </div>
    );
  }
}