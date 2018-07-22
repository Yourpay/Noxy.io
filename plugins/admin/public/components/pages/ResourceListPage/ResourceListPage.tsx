import axios from "axios";
import * as _ from "lodash";
import * as React from "react";
import {Route, Switch} from "react-router-dom";
import {store} from "../../../main";
import Link from "../../ui/misc/Link/Link";
import ResourcePage from "../ResourcePage/ResourcePage";

export default class ResourceListPage extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  componentDidMount() {
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
    return (
      
      <div id="resource-list-page">
        <div id="resource-link-list" key="link">
          {_.map(store.getState().list.resource, (answer, key) => (<Link key={`resource-${key}`} to={`/resource/${key.replace(/__/g, "/")}`}>{key.replace(/__/g, "/")}</Link>))}
        </div>
        <div id="resource-info" key="info">
          <h2>Resources</h2>
          <Switch>
            <Route path="/resource/:resource*" component={ResourcePage}/>
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