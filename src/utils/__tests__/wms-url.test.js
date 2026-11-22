const {
  getWmsServiceUrl,
  getWmsLayerNames,
  setWmsStyle,
  getLegendGraphicUrl,
} = require("../wms-url");

// GetMap URL template, as built by the geomanager
const GETMAP_URL =
  "https://example.com/wms?map=/data/test.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&TRANSPARENT=True&LAYERS=temperature&STYLES=default&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&CRS=EPSG:3857&elevation={elevation}&time={time}";

describe("getWmsServiceUrl", () => {
  test("drops the GetMap parameters and the placeholders, keeps the vendor ones", () => {
    expect(getWmsServiceUrl(GETMAP_URL)).toBe(
      "https://example.com/wms?map=%2Fdata%2Ftest.map"
    );
  });

  test("returns null without URL", () => {
    expect(getWmsServiceUrl(undefined)).toBeNull();
  });
});

describe("getWmsLayerNames", () => {
  test("lists the requested layers", () => {
    expect(getWmsLayerNames(GETMAP_URL)).toEqual(["temperature"]);
    expect(
      getWmsLayerNames("https://example.com/wms?layers=ns%3Aa,ns%3Ab&styles=")
    ).toEqual(["ns:a", "ns:b"]);
  });

  test("returns an empty list without LAYERS", () => {
    expect(getWmsLayerNames("https://example.com/wms")).toEqual([]);
    expect(getWmsLayerNames(undefined)).toEqual([]);
  });
});

describe("setWmsStyle", () => {
  test("replaces the STYLES value, keeping the placeholders", () => {
    expect(setWmsStyle(GETMAP_URL, "anomaly")).toBe(
      GETMAP_URL.replace("STYLES=default", "STYLES=anomaly")
    );
  });

  test("fills an empty STYLES, case-insensitive", () => {
    expect(
      setWmsStyle("https://example.com/wms?styles=&bbox={bbox-epsg-3857}", "a b")
    ).toBe("https://example.com/wms?styles=a%20b&bbox={bbox-epsg-3857}");
  });

  test("adds STYLES when missing", () => {
    expect(setWmsStyle("https://example.com/wms?layers=a", "s")).toBe(
      "https://example.com/wms?layers=a&STYLES=s"
    );
    expect(setWmsStyle("https://example.com/wms", "s")).toBe(
      "https://example.com/wms?STYLES=s"
    );
  });
});

describe("getLegendGraphicUrl", () => {
  test("builds a GetLegendGraphic request on the service URL", () => {
    const url = new URL(getLegendGraphicUrl(GETMAP_URL, "temperature", "anomaly"));

    expect(url.origin + url.pathname).toBe("https://example.com/wms");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      map: "/data/test.map",
      SERVICE: "WMS",
      VERSION: "1.1.1",
      REQUEST: "GetLegendGraphic",
      LAYER: "temperature",
      STYLE: "anomaly",
      FORMAT: "image/png",
    });
  });

  test("returns null without service URL", () => {
    expect(getLegendGraphicUrl(null, "a", "b")).toBeNull();
  });
});
