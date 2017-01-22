import React from 'react';
import { Link } from 'react-router'
import cx from 'classnames';

import styles from './styles.styl';

export default class Item extends React.Component {
  constructor(props) {
    super(props);

    const fallback = '{ "warlock": true, "titan": true, "hunter": true }';
    const prevFilterJSON = localStorage.getItem('filter') || fallback;
    const filter = JSON.parse(prevFilterJSON);

    this.state = {
      filterMenuOpen: false,
      filter,
    };
  }

  componentDidMount() {
    this.props.onFilterChange && this.props.onFilterChange(this.state.filter);
  }

  onFilterChange = (ev) => {
    const filter = {
      ...this.state.filter,
      [ev.target.name]: ev.target.checked,
    };

    localStorage.setItem('filter', JSON.stringify(filter));

    this.setState({ ...this.state, filter });
    this.props.onFilterChange && this.props.onFilterChange(filter);
  }

  toggleFilterMenu = () => {
    this.setState({
      ...this.state,
      filterMenuOpen: !this.state.filterMenuOpen,
    });
  }

  render() {
    const { filterMenuOpen } = this.state;
    const filterButtonClassName = cx(styles.navItem, styles.filterButton, filterMenuOpen && styles.active);

    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <div className={styles.main}>
            <Link to="/" className={styles.siteName}>Destiny Sets</Link>
            <Link to="/" className={styles.navItem} activeClassName={styles.active}>Strikes</Link>
            <Link to="/raid" className={styles.navItem} activeClassName={styles.active}>Raids</Link>
          </div>

          <div className={styles.social}>
            <button className={filterButtonClassName} onClick={this.toggleFilterMenu}>
              Filter <span className={styles.arrow}>▾</span>
            </button>

            <a className={styles.socialItem} target="_blank" href="https://twitter.com/joshhunt">
              <i className="fa fa-twitter" />
            </a>
            <a className={styles.socialItem} target="_blank" href="https://github.com/joshhunt/destinySets">
              <i className="fa fa-github" />
            </a>
          </div>
        </div>

        <div className={cx(styles.filter, filterMenuOpen && styles.filterOpen)}>
          <label className={styles.filterItem}>
            <input type="checkbox" name="warlock" checked={this.state.filter.warlock} onChange={this.onFilterChange}/> Warlock
          </label>

          <label className={styles.filterItem}>
            <input type="checkbox" name="titan" checked={this.state.filter.titan} onChange={this.onFilterChange}/> Titan
          </label>

          <label className={styles.filterItem}>
            <input type="checkbox" name="hunter" checked={this.state.filter.hunter} onChange={this.onFilterChange}/> Hunter
          </label>

        </div>
      </div>
    );
  }
}
