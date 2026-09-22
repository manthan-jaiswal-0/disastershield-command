import { ImdService } from "./imd.service";
import { SachetService } from "./sachet.service";
import { CwcService } from "./cwc.service";
import { BhuvanService, DataGovService, OsmService, OsrmService } from "./configured.service";
export const sources = {
  IMD: new ImdService(), SACHET: new SachetService(), CWC: new CwcService(), Bhuvan: new BhuvanService(),
  "data.gov.in": new DataGovService(), OSM: new OsmService(), OSRM: new OsrmService(),
};
export const sourceStatuses = () => Object.values(sources).map((source) => source.getStatus());
export const sourceManager = { sources, sourceStatuses };