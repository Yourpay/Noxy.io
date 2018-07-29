import * as _ from "lodash";
import * as React from "react";

export default class TextInput extends React.Component<any, any> {
  
  private id: string;
  private label: string;
  private change: Function;
  private type: string = "text";
  private value: string;
  private class: {[key: string]: boolean}
  
  constructor(props) {
    super(props);
    this.change = this.props.change;
    this.class = {"input": true, vertical: !!this.props.vertical}
    console.log("Text input", props)
  }
  
  render() {
    return (
      <div>
        <label htmlFor={this.props.id}>{this.props.label}</label>
        <input type={this.props.type || "text"} className={_.join(_.key(this.class, v => v))} {..._.omit(this.props, ["type", "vertical"])}/>
      </div>
    );
  }
}
