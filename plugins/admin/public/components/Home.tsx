import createBrowserHistory from "history/createBrowserHistory";
import * as React from "react";

export default class Home extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  componentWillMount() {
    createBrowserHistory().push("/login");
  }
  
  render() {
    return (
      <div>
        <h2>Home</h2>
      </div>
    );
  }
}
