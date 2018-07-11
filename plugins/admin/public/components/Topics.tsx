import * as React from "react";
import {Link, Route} from "react-router-dom";
import Topic from "./Topic";

export default class Topics extends React.Component<any, any> {
  
  public match: any;
  
  constructor(props) {
    super(props);
    this.match = props.match;
  }
  
  render() {
    return (
      <div>
        <h2>Topics</h2>
        <ul>
          <li>
            <Link to={`${this.match.url}/rendering`}>Rendering with React</Link>
          </li>
          <li>
            <Link to={`${this.match.url}/components`}>Components</Link>
          </li>
          <li>
            <Link to={`${this.match.url}/props-v-state`}>Props v. State</Link>
          </li>
        </ul>
        
        <Route path={`${this.match.url}/:topicId`} component={Topic}/>
        <Route
          exact
          path={this.match.url}
          render={() => <h3>Please select a topic.</h3>}
        />
      </div>
    );
  }
}

