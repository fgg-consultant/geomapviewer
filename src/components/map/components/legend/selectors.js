import { createStructuredSelector, createSelector } from "reselect";

import {
  getActiveDatasetsFromState,
  getLayerGroups,
  getActiveLayers,
  getComparing,
  getActiveCompareSide,
} from "@/components/map/selectors";

import layersIcon from "@/assets/icons/layers.svg?sprite";

const selectDatasetsLoading = (state) =>
  state.datasets && state.datasets.loading;
const selectCountryDataLoading = (state) =>
  state.countryData && state.countryData.loading;
const selectLayerTimestamps = (state) =>
  state.datasets && state.datasets.timestamps;
const selectLayerLegends = (state) =>
  state.datasets && state.datasets.layerLegends;
const selectLayerWmsStyles = (state) =>
  state.datasets && state.datasets.layerWmsStyles;
const getLocation = (state) => state.location && state.location.payload;

export const getLoading = createSelector(
  [selectDatasetsLoading, selectCountryDataLoading],
  (datasetsLoading, countryDataLoading) => datasetsLoading || countryDataLoading
);

const findStyle = (styles, name) =>
  name && styles.find((s) => s.name.toLowerCase() === name.toLowerCase());

// Styles of a WMS layer to pick from, when its capabilities list several. The
// legend configured in the geomanager is the one of its style: another style
// shows its own legend.
const getWmsStyleProps = (layer, wmsStyles) => {
  if (!wmsStyles || wmsStyles.length < 2) return {};

  // without a style in the GetMap request, the server uses its default one,
  // listed first
  const configuredStyle = findStyle(wmsStyles, layer.styles?.[0]) || wmsStyles[0];
  const selectedStyle =
    layer.wmsStyle && wmsStyles.find((s) => s.name === layer.wmsStyle);
  const activeStyle = selectedStyle || configuredStyle;

  return {
    wmsStyles,
    activeWmsStyle: activeStyle.name,
    ...(activeStyle !== configuredStyle &&
      activeStyle.legendUrl && {
        legendConfig: { type: "image", imageUrl: activeStyle.legendUrl },
      }),
  };
};

const getLegendLayerGroups = createSelector(
  [getLayerGroups, selectLayerTimestamps, selectLayerLegends, selectLayerWmsStyles],
  (groups, layerTimestamps, layerLegends, layerWmsStyles) => {
    if (!groups) return null;

    const lGroups = groups.filter((g) => !g.isBoundary && !g.isRecentImagery);

    return lGroups.map((group) => {
      const layers =
        group.layers &&
        group.layers.map((l) => {
          const timestampsForLayer = layerTimestamps[l.id];

          const layerLegend = layerLegends && layerLegends[l.id];

          // Override legendConfig with image from GetCapabilities
          if (layerLegend && l.legendConfig?.type === "wms_capabilities") {
            l.legendConfig = {
              type: "image",
              imageUrl: layerLegend,
            };
          }

          // Override legendConfig with the color scale the Open-Meteo
          // protocol renders with
          if (layerLegend && l.legendConfig?.type === "openmeteo") {
            l.legendConfig = layerLegend;
          }

          if (l.paramsSelectorConfig) {
            const paramsSelectorConfig = [...l.paramsSelectorConfig];

            paramsSelectorConfig.forEach((p, index) => {
              const param = { ...p };
              if (timestampsForLayer && !!timestampsForLayer.length) {
                const { type } = param;
                if (type && type === "datetime") {
                  param.availableDates = timestampsForLayer;
                }
                if (param.optionsFromTimeStamps) {
                  param.options = timestampsForLayer;
                }
                paramsSelectorConfig[index] = { ...param };
              }
            });

            l.paramsSelectorConfig = paramsSelectorConfig;
          }

          if (l.dynamicLegendByParamConfig) {
            const params = l.params;

            for (const param in params) {
              if (l.dynamicLegendByParamConfig[param]) {
                const val = params[param];

                if (l.dynamicLegendByParamConfig[param][val]) {
                  l.legendConfig = l.dynamicLegendByParamConfig[param][val];
                  break;
                } else {
                  l.legendConfig = {};
                }
              }
            }
          }

          return {
            ...l,
            ...getWmsStyleProps(l, layerWmsStyles && layerWmsStyles[l.id]),
          };
        });

      return { ...group, layers: layers };
    });
  }
);

export const getLegendCompareLinks = createSelector(
  [getActiveCompareSide],
  (activeCompareSide) => [
    {
      label: "LEFT",
      icon: layersIcon,
      active: activeCompareSide === "left",
      mapSide: "left",
    },
    {
      label: "RIGHT",
      icon: layersIcon,
      active: activeCompareSide === "right",
      mapSide: "right",
    },
  ]
);

export const getLegendProps = createStructuredSelector({
  loading: getLoading,
  comparing: getComparing,
  layerGroups: getLegendLayerGroups,
  activeDatasets: getActiveDatasetsFromState,
  activeLayers: getActiveLayers,
  compareLinks: getLegendCompareLinks,
  activeCompareSide: getActiveCompareSide,
  location: getLocation,
});
