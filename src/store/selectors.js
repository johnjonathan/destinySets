import { createSelector } from 'reselect';
import { difference } from 'lodash';
import fp from 'lodash/fp';

import {
  inventoryFromProfile,
  objectivesFromProfile
} from 'app/lib/getFromProfile';
import { NUMERICAL_STATS, STAT_BLACKLIST } from 'app/lib/destinyEnums';

export const cloudInventorySelector = state => state.app.cloudInventory;
export const manualInventorySelector = state => state.app.manualInventory;
export const itemDefsSelector = state => state.definitions.itemDefs;
export const objectiveDefsSelector = state => state.definitions.objectiveDefs;
export const statDefsSelector = state => state.definitions.statDefs;

const baseXurItemsSelector = state => state.app.xur.items;
const profileSelector = state => state.profile.profile;
const vendorDefsSelector = state => state.definitions.vendorDefs;

export const itemHashPropSelector = (state, props) => props.itemHash;

export const makeItemSelector = () => {
  return createSelector(
    itemDefsSelector,
    itemHashPropSelector,
    (itemDefs, itemHash) => {
      return itemDefs ? itemDefs[itemHash] : null;
    }
  );
};

export const makeItemStatsSelector = () => {
  return createSelector(
    itemDefsSelector,
    statDefsSelector,
    itemHashPropSelector,
    (itemDefs, statDefs, itemHash) => {
      if (!(itemDefs && statDefs)) {
        return null;
      }

      const item = itemDefs[itemHash];

      if (!item) {
        return null;
      }

      const stats = Object.values((item.stats && item.stats.stats) || {});

      if (stats.length < 1) {
        return null;
      }

      const filteredStats = stats
        .map(stat => {
          const statDef = statDefs[stat.statHash];

          if (
            !statDef ||
            !statDef.displayProperties.name ||
            STAT_BLACKLIST.includes(stat.statHash)
          ) {
            return null;
          }

          return stat;
        })
        .filter(Boolean)
        .sort(a => (NUMERICAL_STATS.includes(a.statHash) ? -1 : 1));

      return filteredStats.length ? filteredStats : null;
    }
  );
};

export const makeSelectedItemDefsSelector = () => {
  return createSelector(
    itemDefsSelector,
    (state, props) => props.set.sections,
    (itemDefs, sections) => {
      const items = {};

      if (!itemDefs) {
        return {};
      }

      sections.forEach(section => {
        (section.items || []).forEach(itemHash => {
          items[itemHash] = itemDefs[itemHash];
        });

        section.itemGroups &&
          section.itemGroups.forEach(itemList => {
            itemList.forEach(itemHash => {
              items[itemHash] = itemDefs[itemHash];
            });
          });
      });

      return items;
    }
  );
};

export const currentInventorySelector = createSelector(
  profileSelector,
  vendorDefsSelector,
  (profile, vendorDefs) => {
    if (!(profile && vendorDefs)) {
      return null;
    }

    return inventoryFromProfile(profile, vendorDefs);
  }
);

export const inventorySelector = createSelector(
  currentInventorySelector,
  cloudInventorySelector,
  manualInventorySelector,
  (currentInventory, cloudInventory, manualInventory) => {
    if (!currentInventory) {
      return currentInventory;
    }

    const inventory = { ...currentInventory };

    if (cloudInventory) {
      const deletedItems = difference(
        Object.keys(cloudInventory),
        Object.keys(inventory)
      );

      deletedItems.forEach(hash => {
        inventory[hash] = {
          itemHash: hash,
          dismantled: true,
          instances: [{ location: 'cloudInventory' }]
        };
      });
    }

    const manualItems = difference(
      Object.keys(manualInventory),
      Object.keys(inventory)
    );

    manualItems.forEach(hash => {
      inventory[hash] = {
        itemHash: hash,
        manuallyObtained: true,
        instances: [{ location: 'destinySetsManual' }]
      };
    });

    return inventory;
  }
);

export const xurItemsSelector = createSelector(
  inventorySelector,
  baseXurItemsSelector,
  (inventory, xurHashes) => {
    if (!inventory) {
      return { obtainedItems: [], newItems: xurHashes };
    }

    const obtainedItems = [];
    const newItems = [];

    xurHashes.forEach(itemHash => {
      (inventory[itemHash] ? obtainedItems : newItems).push(itemHash);
    });

    return { obtainedItems, newItems };
  }
);

export const xurHasNewItemsSelector = createSelector(
  xurItemsSelector,
  xurItems => {
    return xurItems.newItems.length > 0;
  }
);

export const objectiveInstancesSelector = createSelector(
  profileSelector,
  profile => {
    if (!profile) {
      return {};
    }

    return objectivesFromProfile(profile);
  }
);

export const makeItemInventoryEntrySelector = () => {
  return createSelector(
    inventorySelector,
    itemHashPropSelector,
    (inventory, itemHash) => {
      return inventory ? inventory[itemHash] : null;
    }
  );
};

const itemSelector = (state, ownProps) => ownProps.item;

const extractInstances = fp.flatMapDeep(
  characterEquipment => characterEquipment.items
);

const itemInstancesSelector = createSelector(profileSelector, profile => {
  console.log('Running itemInstancesSelector');

  return fp.flow(
    fp.concat(extractInstances(profile.characterEquipment.data)),
    fp.concat(extractInstances(profile.characterInventories.data)),
    fp.concat(profile.profileInventory.data.items),
    fp.map(itemInstance => {
      return {
        ...itemInstance,
        $sockets: (
          profile.itemComponents.sockets.data[itemInstance.itemInstanceId] || {}
        ).sockets
      };
    }),
    fp.groupBy(component => component.itemHash)
  )([]);
});

export const NO_DATA = -1;
export const NO_CATALYST = 0;
export const INACTIVE_CATALYST = 1;
export const ACTIVE_CATALYST_INPROGRESS = 2;
export const ACTIVE_CATALYST_COMPLETE = 3;
export const MASTERWORK_UPGRADED = 4;

export const makeCatalystSelector = () => {
  return createSelector(
    itemInstancesSelector,
    itemDefsSelector,
    itemSelector,
    (equipment, itemDefs, item) => {
      if (!item || !itemDefs) {
        return null;
      }

      let status = NO_DATA;
      let objectives = null;
      const instances = equipment[item.hash] || [];

      instances.forEach(instance => {
        if (!instance.$sockets) {
          return;
        }

        instance.$sockets.forEach(plug => {
          if (!plug.reusablePlugs) {
            return;
          }

          status = Math.max(status, NO_CATALYST);

          plug.reusablePlugs.forEach(reusablePlug => {
            const reusablePlugDef = itemDefs[reusablePlug.plugItemHash];
            if (
              reusablePlugDef.plug.uiPlugLabel === 'masterwork_interactable'
            ) {
              if (reusablePlugDef.plug.insertionRules.length) {
                if (reusablePlug.canInsert) {
                  status = Math.max(status, ACTIVE_CATALYST_COMPLETE);
                } else {
                  status = Math.max(status, ACTIVE_CATALYST_INPROGRESS);
                }

                if (reusablePlug.plugObjectives) {
                  objectives = reusablePlug.plugObjectives;
                }
              } else {
                status = Math.max(status, INACTIVE_CATALYST);
              }
            }
          });
        });
      });

      objectives && console.log('objectives:', objectives);

      return {
        status,
        objectives
      };
    }
  );
};

export const makeItemInstanceSelector = () => {
  return createSelector(
    itemInstancesSelector,
    itemSelector,
    (equipment, item) => {
      if (!item) {
        return null;
      }

      return equipment[item.hash];
    }
  );
};
