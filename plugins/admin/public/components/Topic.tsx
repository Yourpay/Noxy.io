import * as React from "react";

export default class Topic extends React.Component<any, any> {
  public match: any;
  
  constructor(props) {
    super(props);
    this.match = props.match;
  }
  
  componentWillReceiveProps(props) {
    this.match = props.match;
  }
  
  render() {
    return (
      <div>
        <h3>{this.match.params.topicId}</h3>
      </div>
    );
  }
}
