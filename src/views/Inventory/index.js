import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  setFilterItem,
  setXurData,
  removeTrackedItem
} from 'app/store/reducer';
import { fetchProfile } from 'app/store/profile';

import {
  setVendorDefs,
  setItemDefs,
  setObjectiveDefs,
  setStatDefs
} from 'app/store/definitions';

import * as ls from 'app/lib/ls';
import * as destiny from 'app/lib/destiny';
import { getDefinition } from 'app/lib/manifestData';

import Footer from 'app/components/Footer';
import Section from 'app/components/Section';
import Popper from 'app/components/Popper';
import ItemTooltip from 'app/components/ItemTooltip';
import ItemModal from 'app/components/ItemModal';
import XurModal from 'app/components/XurModal';
import SectionList from 'app/components/SectionList';

import { filteredSetDataSelector } from './selectors';
import styles from './styles.styl';

const FETCH_INTERVAL = 30 * 1000;

class Inventory extends Component {
  state = {
    popperItemHash: null,
    popperElement: null,
    unexpectedError: false
  };

  componentDidMount() {
    this.fetchDefinitions(this.props.language);
    this.potentiallyScheduleFetchProfile();
  }

  componentWillUnmount() {
    window.clearInterval(this.intervalId);
    this.intervalId = null;
  }

  componentDidUpdate(oldProps) {
    const { filters, language, trackedItems } = this.props;

    if (filters !== oldProps.filters) {
      ls.saveFilters(filters);
    }

    if (language !== oldProps.language) {
      this.fetchDefinitions(language);
    }

    if (trackedItems !== oldProps.trackedItems) {
      this.potentiallyScheduleFetchProfile(this.props);
    }
  }

  potentiallyScheduleFetchProfile = (props = this.props) => {
    if (!this.intervalId && props.trackedItems.length > 0) {
      this.intervalId = window.setInterval(() => {
        props.fetchProfile();
      }, FETCH_INTERVAL);
    }
  };

  fetchDefinitions({ code: lang }) {
    const {
      setVendorDefs,
      setStatDefs,
      setItemDefs,
      setObjectiveDefs,
      setXurData
    } = this.props;

    destiny.xur().then(setXurData);
    getDefinition('DestinyVendorDefinition', lang).then(setVendorDefs);
    getDefinition('DestinyStatDefinition', lang).then(setStatDefs);
    getDefinition('DestinyObjectiveDefinition', lang).then(setObjectiveDefs);

    this.itemDefsPromise = this.props.location.query.fullItemDefs
      ? getDefinition('reducedCollectableInventoryItems', lang, false)
      : getDefinition('DestinyInventoryItemDefinition', lang);
    this.itemDefsPromise.then(setItemDefs);
  }

  setPopper = (itemHash, element) =>
    this.setState({ itemTooltip: itemHash ? { itemHash, element } : null });

  setItemModal = itemHash => this.setState({ itemModal: itemHash });
  setXurModal = isOpen => this.setState({ xurModal: isOpen });
  removeTrackedItem = item => this.props.removeTrackedItem(item.hash);

  render() {
    const { filters, filteredSetData, trackedItems } = this.props;
    const { itemTooltip, itemModal, xurModal } = this.state;

    return (
      <div className={styles.root}>
        <SectionList
          setData={filteredSetData}
          filters={filters}
          setFilterItem={this.props.setFilterItem}
        />

        {filteredSetData.map(({ sets, slug, name }, index) => (
          <Section
            key={index}
            name={name}
            sets={sets}
            slug={slug}
            setPopper={this.setPopper}
            setModal={this.setItemModal}
          />
        ))}

        <Footer />

        {itemTooltip && (
          <Popper key={itemTooltip.hash} element={itemTooltip.element}>
            <ItemTooltip itemHash={itemTooltip.itemHash} />
          </Popper>
        )}

        {trackedItems.length > 0 && (
          <div className={styles.trackedItems}>
            {trackedItems.map(hash => (
              <ItemTooltip
                key={hash}
                itemHash={hash}
                small={true}
                dismiss={this.removeTrackedItem}
              />
            ))}
          </div>
        )}

        <ItemModal
          itemHash={itemModal}
          isOpen={!!itemModal}
          onRequestClose={() => this.setItemModal(null)}
        />

        <XurModal
          isOpen={xurModal}
          onRequestClose={() => this.setXurModal(false)}
        />
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    filters: state.app.filters,
    language: state.app.language,
    trackedItems: state.app.trackedItems,
    filteredSetData: filteredSetDataSelector(state, ownProps)
  };
};

const mapDispatchToActions = {
  fetchProfile,
  setVendorDefs,
  setItemDefs,
  setObjectiveDefs,
  setStatDefs,
  setFilterItem,
  removeTrackedItem,
  setXurData
};

export default connect(mapStateToProps, mapDispatchToActions)(Inventory);
