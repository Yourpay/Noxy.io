import * as _ from "lodash";
import * as React from "react";

export default class Table extends React.Component<any, any> {
  
  private ref: any;
  private headers: string[];
  private element: HTMLElement;
  private widths: {[key: string]: number} = {};
  
  constructor(props: iTableProps) {
    super(props);
    this.ref = React.createRef();
  }
  
  render() {
    // this.headers = _.keys(this.props.object[0]);
    this.element = _.get(this.ref, "current", "");
    this.headers = _.reduce(this.props.object[0], (r, v, k) => _.isPlainObject(v) ? _.concat(r, v.id ? `${k}.id` : _.findKey(v, t => !_.isArrayLikeObject(t))) : !_.isArrayLikeObject(v) ? _.concat(r, k) : r, []);
    if (this.element) {
      const rect = this.ref.current.getBoundingClientRect();
      const element = document.createElement("canvas");
      const context = element.getContext("2d");
      context.font = window.getComputedStyle(this.ref.current || null).font;
      this.widths = _.reduce(
        this.headers,
        (r, h) => _.merge(r, {
          [h]: _.reduce(this.props.object, (v, row) => {
            const a = _.get(row, h);
            const b = context.measureText(a).width;
            return b > v ? b : v;
          }, context.measureText(this.headers[h]).width)
        }),
        {}
      );
      const rate = rect.width / _.reduce(this.widths, (r, v) => r + v, 0);
      console.log(rate, this.ref.current.getBoundingClientRect().width, _.reduce(this.widths, (r, v) => r + v, 0));
      _.merge(this.widths, _.mapValues(this.widths, (w: number) => 1 + Math.ceil(w * (rate > 1 ? rate : 1))));
    }
    
    return (
      <div className={this.props.className || "table"} ref={this.ref}>
        <TableHeader widths={this.widths} headers={this.headers}/>
        {_.map(this.props.object, (row, key) => <TableRow key={key} widths={this.widths} data={row} headers={this.headers}/>)}
      </div>
    );
  }
}

class TableHeader extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div className="table-header">
        {_.map(this.props.headers, (header, k) => <span style={{"width": this.props.widths[header] || 0}} key={k}>{header}</span>)}
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
        {_.map(this.props.headers, (header, k) => <span style={{"width": this.props.widths[header] || 0}} key={k}>{_.get(this.props.data, header, "")}</span>)}
      </div>
    );
  }
  
}

interface iTableProps {
  object: {
    [key: string]: any[] | {[key: string]: any}
  }
}
