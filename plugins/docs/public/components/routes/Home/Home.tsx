import * as React from "react";
import {store} from "../../../main";
import Button from "../../ui/Button/Button";

export default class Home extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div id="home">
        <Button text={"Go to chat"} onClick={() => store.dispatch({reducer: "route", type: "change", value: "Chat"})}/>
        <Button text={"Increment 1"} onClick={() => store.dispatch({reducer: "counter", type: "increment", value: 1})}/>
        <Button text={"Increment 5"} onClick={() => store.dispatch({reducer: "counter", type: "increment", value: 5})}/>
        <Button text={"Decrement 1"} onClick={() => store.dispatch({reducer: "counter", type: "decrement", value: 1})}/>
        <Button text={"Decrement 5"} onClick={() => store.dispatch({reducer: "counter", type: "decrement", value: 5})}/>
        
        <div>This is {store.getState().route} route</div>
        <div>Current count is: {store.getState().counter}</div>
      </div>
    );
  }
  
  componentDidMount() {
    document.title = "Home";
  }
  
}

