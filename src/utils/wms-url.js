// Helpers on the GetMap URL templates of the WMS layers. Kept apart from
// `wms.js` so that the map selectors can use them without loading ogc-client.

// GetMap parameters, that the other requests to the service must not carry
const GETMAP_PARAMS = [
  "service",
  "version",
  "request",
  "layers",
  "styles",
  "bbox",
  "width",
  "height",
  "format",
  "transparent",
  "crs",
  "srs",
  "time",
  "tiled",
  "bgcolor",
  "exceptions",
];

const LAYERS_PARAM = /[?&]layers=([^&#]*)/i;
const STYLES_PARAM = /([?&]styles=)[^&#]*/i;

const hasPlaceholder = (value) => /\{[^}]*\}/.test(value);

const decode = (value) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
};

/**
 * URL of the WMS service of a GetMap URL template: the GetMap parameters and
 * the ones holding a placeholder ("{time}", "{bbox-epsg-3857}"...) are dropped,
 * the vendor parameters (e.g. the MapServer "map") are kept.
 */
export function getWmsServiceUrl(getMapUrl) {
  if (!getMapUrl) return null;

  try {
    const base =
      typeof window !== "undefined" ? window.location.href : undefined;
    const url = new URL(getMapUrl, base);

    [...url.searchParams.entries()].forEach(([key, value]) => {
      if (GETMAP_PARAMS.includes(key.toLowerCase()) || hasPlaceholder(value)) {
        url.searchParams.delete(key);
      }
    });

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Names of the layers requested by a GetMap URL template.
 */
export function getWmsLayerNames(getMapUrl) {
  const match = getMapUrl && getMapUrl.match(LAYERS_PARAM);
  if (!match) return [];

  return decode(match[1]).split(",").filter(Boolean);
}

/**
 * Set the STYLES parameter of a GetMap URL template. The URL is not parsed, to
 * keep its placeholders as they are.
 */
export function setWmsStyle(getMapUrl, styleName) {
  const value = encodeURIComponent(styleName || "");

  if (STYLES_PARAM.test(getMapUrl)) {
    return getMapUrl.replace(STYLES_PARAM, (match, prefix) => prefix + value);
  }

  const separator = getMapUrl.includes("?") ? "&" : "?";
  return `${getMapUrl}${separator}STYLES=${value}`;
}

/**
 * GetLegendGraphic URL of a style, for the styles whose capabilities give no
 * legend URL.
 */
export function getLegendGraphicUrl(serviceUrl, layerName, styleName) {
  const service = getWmsServiceUrl(serviceUrl);
  if (!service) return null;

  const url = new URL(service);

  Object.entries({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetLegendGraphic",
    LAYER: layerName,
    STYLE: styleName,
    FORMAT: "image/png",
  }).forEach(([key, value]) => url.searchParams.set(key, value));

  return url.toString();
}
