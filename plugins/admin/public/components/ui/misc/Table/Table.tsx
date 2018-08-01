import * as React from "react";

export default class Table extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
    this.state = {widths: {}};
  }
  
  render() {
    return (
      <div className="table">
        <TableRow/>
      </div>
    );
  }
}

class TableRow extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div className="table-row">
        <TableColumn/>
      </div>
    );
  }
  
}

class TableColumn extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div className="table-column"></div>
    );
  }
  
}