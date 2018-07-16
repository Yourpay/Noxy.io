import * as React from "react";

export default class ResourceListPage extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
    console.log(props);
  }
  
  componentDidMount() {
    console.log("Resource page mounted", this.state);
    this.setState({loading: true, resource: this.props.match.params.resource});
    console.log(this.state);
  }
  
  componentWillReceiveProps(props) {
    console.log("Resource page propped", this.state);
    console.log(props);
    // if (this.state && this.state.resource !== props.match.params.resource) {
    //   const resource = props.match.params.resource.replace(/_/g, "/");
    //   this.setState({loading: true, resource: resource});
    //   axios({
    //     method:  "GET",
    //     baseURL: store.getState().api,
    //     url:     `/${resource}`,
    //     headers: {
    //       "Authorization": window.localStorage.jwt
    //     }
    //   })
    //   .then(res => {
    //     if (this.state.resource === resource) { this.setState({loading: false}); }
    //     store.dispatch({reducer: "resource", type: "update", value: {[resource]: res.data.content}});
    //   });
    // }
  }
  
  render() {
    console.log("Resource page rendered", this.state);
    return (
      <div>This is a resource page</div>
    );
  }
}
