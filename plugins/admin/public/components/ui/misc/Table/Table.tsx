import * as _ from "lodash";
import * as React from "react";

export default class Table extends React.Component<any, any> {
  
  private readonly ref: React.RefObject<HTMLDivElement>;
  private element: HTMLElement;
  private headers: string[];
  private data: any;
  
  constructor(props) {
    super(props);
    this.ref = React.createRef();
  }
  
  render() {
    if (!_.isEqual(this.data, this.props.data)) {
      this.data = this.props.data;
      this.headers = _.reduce(this.props.data, (r, v) => _.uniq(_.concat(r, _.keys(v))), []);
      this.element = _.get(this.ref, "current");
      console.log("Table", this.element, this.data, this.props.data);
    }
    
    return (
      <div className={this.props.className}>
        <div className="table" ref={this.ref}>
          <TableRow data={this.headers}/>
        </div>
      </div>
    );
  }
}

class TableRow extends React.Component<any, any> {
  
  private readonly ref: React.RefObject<HTMLDivElement>;
  private element: HTMLElement;
  private data: any;
  
  constructor(props) {
    super(props);
    this.ref = React.createRef();
  }
  
  render() {
    if (!_.isEqual(this.data, this.props.data)) {
      this.data = this.props.data;
      this.element = _.get(this.ref, "current");
      console.log("Row", this.element, this.data);
    }
    
    return (
      <div className="table-row" ref={this.ref}>
        {_.map(this.data, (v, k) => <TableColumn key={k} data={v}/>)}
      </div>
    );
  }
  
}

class TableColumn extends React.Component<any, any> {
  
  private readonly ref: React.RefObject<HTMLDivElement>;
  private element: HTMLElement;
  private data: any;
  
  constructor(props) {
    super(props);
    this.ref = React.createRef();
  }
  
  render() {
    if (!_.isEqual(this.data, this.props.data)) {
      this.data = this.props.data;
      this.element = _.get(this.ref, "current");
      console.log("Column", this.element, this.data);
    }
    
    return (
      <div className="table-column" ref={el => this.element = el}>
        {_.map([this.data], (v, k) => <span key={k}>{v}</span>)}
      </div>
    );
  }
  
}

// this.headers = _.reduce(this.props.object[0], (r, v, k) => _.isPlainObject(v) ? _.concat(r, v.id ? `${k}.id` : _.findKey(v, t => !_.isArrayLikeObject(t))) : !_.isArrayLikeObject(v) ? _.concat(r, k) : r, []);
// if (this.element) {
//   const rect = this.ref.current.getBoundingClientRect();
//   const element = document.createElement("canvas");
//   const context = element.getContext("2d");
//   context.font = window.getComputedStyle(this.ref.current || null).font;
//   this.widths = _.reduce(
//     this.headers,
//     (r, h) => _.merge(r, {
//       [h]: _.reduce(this.props.object, (v, row) => {
//         const a = _.get(row, h);
//         const b = context.measureText(a).width;
//         return b > v ? b : v;
//       }, context.measureText(this.headers[h]).width)
//     }),
//     {}
//   );
//   const rate = rect.width / _.reduce(this.widths, (r, v) => r + v, 0);
//   console.log(rate, this.ref.current.getBoundingClientRect().width, _.reduce(this.widths, (r, v) => r + v, 0));
//   _.merge(this.widths, _.mapValues(this.widths, (w: number) => 1 + Math.ceil(w * (rate > 1 ? rate : 1))));
// }