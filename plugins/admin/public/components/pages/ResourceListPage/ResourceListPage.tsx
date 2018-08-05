import Promise from "aigle";
import axios from "axios";
import * as _ from "lodash";
import * as React from "react";
import {Route, Switch} from "react-router-dom";
import ResourceCollection from "../../../classes/ResourceCollection";
import {store} from "../../../main";
import Link from "../../ui/misc/Link/Link";
import Table from "../../ui/misc/Table/Table";

export default class ResourceListPage extends React.Component<any, any> {
  
  private static readonly url = "/db";
  
  constructor(props) {
    super(props);
  }
  
  componentDidMount() {
    store.dispatch({
      type:  "list-start",
      value: {
        loading: {
          [ResourceListPage.url]: store.getState().loading[ResourceListPage.url] || axios({
            method:  "GET",
            baseURL: store.getState().url.api,
            url:     ResourceListPage.url,
            headers: {
              "Authorization": window.localStorage.jwt
            }
          })
          .then(res => {
            store.dispatch({
              type:  "list-end",
              value: {resource: _.mapValues(res.data.content, (v, k) => new ResourceCollection(k, v))}
            });
          })
        }
      }
    });
  }
  
  render() {
    return (
      <div id="resource-list-page">
        <div id="resource-link-list" key="link">
          {_.map(store.getState().resource, (answer, key) => (<Link key={`resource-${key}`} to={`/resource/${key.replace(/__/g, "/")}`}>{key.replace(/__/g, "/")}</Link>))}
        </div>
        <div id="resource-info" key="info">
          <h2>Resources</h2>
          <Switch>
            <Route path="/resource/:resource*" component={ResourcePage}/>
            <Route component={ResourceInfoPage}/>
          </Switch>
        </div>
      </div>
    );
  }
}

class ResourcePage extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
    this.state = {resource: null, start: 0, limit: 10};
  }
  
  componentDidUpdate() {
    const resource = _.get(this.props, "match.params.resource");
    if (resource && _.get(store.getState(), ["resource", resource])) {
      const url = `/${this.props.match.params.resource}`;
      if (!_.get(store.getState(), ["loading", url]) || _.result(store.getState(), ["loading", url, "isFulfilled"])) {
        store.dispatch({
          type:  "object-start",
          value: {
            loading: {
              [url]: Promise.resolve(axios({
                method:  "GET",
                baseURL: store.getState().url.api,
                url:     url,
                headers: {
                  "Authorization": window.localStorage.jwt
                }
              })
              .then(res => {
                console.log(res);
                store.dispatch({
                  type:  "object-end",
                  value: {resource: {}}
                });
              }))
            }
          }
        });
      }
    }
  }
  
  render() {
    return (
      <Table data={_.get(store.getState(), ["resource", this.state.resource], [])}/>
    );
  }
}

class ResourceInfoPage extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div>
        <h2>Info</h2>
      </div>
    );
  }
}