import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  xurItemsSelector,
  itemDefsSelector,
  inventorySelector
} from 'app/store/selectors';
import { setXurModal } from 'app/store/xur';
import Item from 'app/components/NewItem';
import Icon from 'app/components/Icon';
import Modal from 'app/components/Modal';

import xur from './xur.png';
import styles from './styles.styl';

class XurModalContent extends Component {
  render() {
    const {
      onRequestClose,
      xurItems: { newItems, obtainedItems },
      inventory,
      itemDefs,
      location
    } = this.props;

    return (
      <div className={styles.root}>
        <button className={styles.close} onClick={onRequestClose}>
          <Icon icon="times" />
        </button>

        <div className={styles.header}>
          <img className={styles.xurImage} src={xur} alt="" />
          <div>
            <h1 className={styles.heading}>Xûr is back</h1>
            <p>
              Xûr is selling his wares this week in{' '}
              {location ? (
                <strong>
                  {location.region}, {location.planet}
                </strong>
              ) : (
                <strong>
                  <em> location classified </em>
                </strong>
              )}
            </p>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.items}>
            {[...newItems, ...obtainedItems].map(itemHash => (
              <Item
                className={styles.item}
                key={itemHash}
                item={itemDefs && itemDefs[itemHash]}
                inventoryEntry={inventory && inventory[itemHash]}
                extended
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
}

function XurModalWrapper({ isOpen, closeModal, ...props }) {
  return (
    <Modal isOpen={isOpen} onRequestClose={closeModal}>
      {isOpen && <XurModalContent {...props} onRequestClose={closeModal} />}
    </Modal>
  );
}

const mapStateToProps = () => {
  return (state, ownProps) => {
    return {
      xurItems: xurItemsSelector(state),
      itemDefs: itemDefsSelector(state),
      inventory: inventorySelector(state),
      location: state.xur.location,
      isOpen: state.xur.modalOpen
    };
  };
};

const closeModal = setXurModal.bind(null, false);

export default connect(mapStateToProps, { closeModal })(XurModalWrapper);
