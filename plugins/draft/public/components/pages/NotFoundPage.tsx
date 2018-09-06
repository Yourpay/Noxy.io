import * as React from "react";

export default class NotFoundPage extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div>
        <h2>404 - No resource found.</h2>
      </div>
    );
  }
}
