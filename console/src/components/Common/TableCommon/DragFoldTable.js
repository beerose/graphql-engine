/* eslint-disable */

import React, { Component, Fragment } from 'react';
import ReactTable from 'react-table';
import 'react-table/react-table.css';
import FoldableHoc from './foldableTable';

import styles from '../../Common/TableCommon/Table.scss';

class DragFoldTable extends Component {
  constructor(props) {
    super(props);
    this.dragged = null;
    this.reorders = props.defaultReorders || [];
    this.state = {
      trigger: 0,
      folded: props.defaultCollapsed || {},
    };
  }
  mountEvents() {
    const headers = Array.prototype.slice.call(
      document.querySelectorAll('.draggable-header')
    );

    headers.forEach((header, i) => {
      header.setAttribute('draggable', true);
      //the dragged header
      header.ondragstart = e => {
        e.stopPropagation();
        this.dragged = i;
      };

      header.ondrag = e => e.stopPropagation;

      header.ondragend = e => {
        e.stopPropagation();
        setTimeout(() => (this.dragged = null), 1000);
      };

      //the dropped header
      header.ondragover = e => {
        e.preventDefault();
      };

      header.ondrop = e => {
        e.preventDefault();
        if (this.dragged) {
          this.reorders.push({
            newOrder: i,
            defaultOrder: this.dragged,
          });
        }
        if (this.props.onOrderChange) {
          this.props.onOrderChange(this.reorders);
        }
        this.setState({ trigger: Math.random() });
      };
    });
  }
  componentDidMount() {
    this.mountEvents();
  }

  componentDidUpdate() {
    this.mountEvents();
  }
  render() {
    const { data, columns } = this.props;

    const cols = columns.map(col => ({
      ...col,
      Header: (
        <div
          className="draggable-header"
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          {col.Header && (
            <Fragment>
              {col.Header}
              <span
                className={styles.tableHeaderCell}
                title="Drag column to rearrange"
              >
                <i className="fa fa-bars" style={{ right: '20px' }} />
              </span>
            </Fragment>
          )}
        </div>
      ),
    }));

    //run all reorder events
    this.reorders.forEach(o =>
      cols.splice(o.newOrder, 0, cols.splice(o.defaultOrder, 1)[0])
    );

    const FoldableTable = FoldableHoc(ReactTable);

    //render
    return (
      <div className="esr-table">
        <FoldableTable
          {...this.props}
          data={data}
          columns={cols}
          onFoldChange={newFolded => {
            if (this.props.onCollapseChange) {
              this.props.onCollapseChange(newFolded);
            }
            this.setState({ folded: newFolded });
          }}
          folded={this.state.folded}
        />
      </div>
    );
  }
}

export default DragFoldTable;
