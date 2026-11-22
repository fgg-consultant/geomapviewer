import { WmsEndpoint, expandTimeInterval } from "@camptocamp/ogc-client";
import uniqBy from "lodash/uniqBy";

import { getLegendGraphicUrl } from "./wms-url";

// only the latest timestamps are kept, to avoid the browser hanging on large time
// ranges (same limit as the ogc-client default, which keeps the earliest ones)
export const MAX_TIMESTAMPS = 3650;

// ogc-client gives Date objects, or ISO strings when the capabilities come from its cache
const toDate = (value) => (value ? new Date(value) : null);

const isInterval = (value) =>
  !!value && typeof value === "object" && "period" in value;

const periodToMilliseconds = ({ days, hours, minutes, seconds }) =>
  (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;

/**
 * Expand a time interval "begin/end/period" into dates, keeping the latest `max` ones.
 */
function expandInterval(interval, max) {
  const begin = toDate(interval.begin);
  const end = toDate(interval.end);
  const { period } = interval;

  // bounds or period that ogc-client could not parse (e.g. compact dates "19830101")
  if (!begin || !end || !period) return [];

  // skip the oldest dates; years and months have a variable length and are
  // expanded from the beginning
  let start = begin;
  const periodMs = periodToMilliseconds(period);
  if (!period.years && !period.months && periodMs > 0) {
    const count = Math.floor((end - begin) / periodMs) + 1;
    start = new Date(begin.getTime() + Math.max(0, count - max) * periodMs);
  }

  return expandTimeInterval({ begin: start, end, period }, Infinity).slice(-max);
}

/**
 * List the timestamps of the time dimension of a layer read by ogc-client, as
 * sorted ISO strings. The dimension values can mix single dates and intervals
 * (WMS 1.3.0 Annex C).
 */
export function extractTimestamps(layer, max = MAX_TIMESTAMPS) {
  const values = layer?.timeDimension?.values;
  if (!values) return null;

  const times = new Set(
    []
      .concat(values)
      .flatMap((value) =>
        isInterval(value) ? expandInterval(value, max) : [toDate(value)]
      )
      .filter(Boolean)
      .map((date) => date.getTime())
  );

  return [...times]
    .sort((a, b) => a - b)
    .slice(-max)
    .map((time) => new Date(time).toISOString());
}

export function extractLegendUrl(layer, styleName) {
  const styles = layer?.styles || [];
  let style;

  if (styleName) {
    const styleNameLower = styleName.toLowerCase();
    style = styles.find((s) => s.name?.toLowerCase() === styleNameLower);
  }

  // fall back to first style if no match or no style name specified
  if (!style) {
    style = styles[0];
  }

  return style?.legendUrl || null;
}

/**
 * List the styles of a layer read by ogc-client, with the URL of their legend:
 * the one of the capabilities, or else a GetLegendGraphic request.
 */
export function extractStyles(layer, wmsUrl) {
  // some services list a style twice, e.g. inherited from a parent layer
  const styles = uniqBy(
    (layer?.styles || []).filter((style) => style.name),
    "name"
  );

  return styles.map(({ name, title, legendUrl }) => ({
      name,
      title: title || name,
      legendUrl: legendUrl || getLegendGraphicUrl(wmsUrl, layer.name, name),
    }));
}

/**
 * Read the timestamps, the legend URL and the styles of a layer from the WMS
 * capabilities. ogc-client fetches and parses the capabilities in a worker,
 * and caches them.
 */
export async function getWmsLayerInfo(wmsUrl, layerName, styleName) {
  try {
    const endpoint = await new WmsEndpoint(wmsUrl).isReady();
    const layer = endpoint.getLayerByName(layerName);

    const result = {};

    const styles = extractStyles(layer, wmsUrl);
    if (styles.length) {
      result.styles = styles;
    }

    const timestamps = extractTimestamps(layer);
    if (timestamps) {
      result.timestamps = timestamps;
    }

    const legendUrl = extractLegendUrl(layer, styleName);
    if (legendUrl) {
      result.legendUrl = legendUrl;
    }

    return result;
  } catch (error) {
    console.error(
      `Error fetching or parsing GetCapabilities document: ${error.message}`
    );
    return {};
  }
}
