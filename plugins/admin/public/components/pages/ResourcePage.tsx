import axios from "axios";
import * as _ from "lodash";
import * as React from "react";
import {Link} from "react-router-dom";
import {store} from "../../main";

export default class ResourcePage extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  componentWillMount() {
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
      <div>
        <h2>Resources</h2>
        {
          console.log("test", store.getState(), store.getState().resource.list) ||
          _.map(store.getState().resource.list, (answer, key) => (<Link key={`resource-${key}`} to={`/resource/${key}`}>{key}</Link>))}
      </div>
    );
  }
}
