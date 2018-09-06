import * as React from "react";
import * as rrdom from "react-router-dom";

export default class Link extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div className="link" {...this.props}>
        <rrdom.Link to={this.props.to}> {this.props.children}</rrdom.Link>
      </div>
    );
  }
}
