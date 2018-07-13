import * as React from "react";
import {Redirect, Route, RouteProps} from "react-router";
import {store} from "../../main";

export default class PrivateRoute extends React.Component<RouteProps> {
  
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <Route exact={this.props.exact} path={this.props.path} render={props =>
        store.getState().authenticated
        ? (React.createElement(this.props.component))
        : (<Redirect to={{pathname: "/login"}}/>)
      }>
      </Route>
    );
  }
}
