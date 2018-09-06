import * as _ from "lodash";
import * as React from "react";

export default class TextInput extends React.Component<any, any> {
  
  private readonly class: string[];
  
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.class = [
      "input",
      this.props.vertical ? "vertical" : ""
    ];
  }
  
  public handleChange(event) {
    this.props.onChange(event);
  }
  
  public render() {
    const value = this.props.value;
    return (
      <div>
        <label htmlFor={this.props.id}>{this.props.label}</label>
        <input type={this.props.type || "text"} id={this.props.id} className={_.join(this.class, " ")} value={value} onChange={this.handleChange}/>
      </div>
    );
  }
}
