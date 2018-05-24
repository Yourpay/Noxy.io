import * as _ from "lodash";
import * as React from "react";
import {store} from "../../../main";
import Button from "../../ui/Button/Button";


export default class Chat extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    
    return (
      <div id="chat">
        <Button text={"Go to home"} onClick={() => store.dispatch({reducer: "route", type: "change", value: "Home"})}/>
        <div>In the {store.getState().route} window</div>
        <div>Current count is: {store.getState().counter}</div>
      </div>
    );
  }
  
  componentDidMount() {
    document.title = "Chat";
  }
  
}