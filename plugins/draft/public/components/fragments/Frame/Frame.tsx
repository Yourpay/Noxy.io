import * as React from "react";
import {Route, Switch} from "react-router";

import HomePage from "../../pages/HomePage/HomePage";
import NotFoundPage from "../../pages/NotFoundPage";
import Link from "../../ui/misc/Link/Link";

export default class Frame extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div id="frame">
        <div id="navbar">
          <Link to="/">Home</Link>
          <Link to="/resource">Resources</Link>
        </div>
        <div id="content">
          <Switch>
            <Route exact path="/" component={HomePage}/>
            <Route component={NotFoundPage}/>
          </Switch>
        </div>
      </div>
    );
  }
}
