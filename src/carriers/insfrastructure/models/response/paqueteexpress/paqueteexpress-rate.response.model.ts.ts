export interface PaqueteExpressRateResponseModel {
  header: object;
  body: Body;
}

interface Body {
  request: object;
  response: Response;
}

interface Response {
  success: boolean;
  message: object;
  data: Data;
}

interface Data {
  clientId: string;
  clientDest: string;
  clntClasifTarif: string;
  agreementType: string;
  pymtMode: string;
  clientAddrOrig: ClientAddr;
  clientAddrDest: ClientAddr;
  quoteServices: string[];
  quotations: Quotation[];
}

interface ClientAddr {
  colonyName: string;
  zipCode: string;
  branch: string;
  zone: string;
  ol: string;
}

interface Quotation {
  serviceType: string;
  id: string;
  idRef: string;
  serviceName: string;
  serviceInfoDescr: string;
  serviceInfoDescrLong: string;
  cutoffDateTime: string;
  cutoffTime: string;
  maxRadTime: string;
  maxBokTime: string;
  onTime: boolean;
  promiseDate: string;
  promiseDateDaysQty: number;
  promiseDateHoursQty: number;
  inOffer: boolean;
  shipmentDetail: ShipmentDetail;
  services: Services;
  otherServices: OtherServices;
  amount: Amount;
}

interface ShipmentDetail {
  shipments: Shipment[];
}

interface Shipment {
  sequence: number;
  quantity: number;
  shpCode: string;
  weight: number;
  longShip: number;
  widthShip: number;
  highShip: number;
  srvcId: string;
  srvcRefId: string;
  slabNo: string;
  volume: number;
  slabDisc: number;
  slabTax: number;
  slabTaxRet: number;
  slabAmount: number;
  convenio: string;
  cpny: string;
}

interface Services {
  dlvyType: string;
  ackType: string;
  totlDeclVlue: number;
  invType: string;
  radType: string;
  dlvyTypeAmt: number;
  dlvyTypeAmtDisc: number;
  dlvyTypeAmtTax: number;
  dlvyTypeAmtRetTax: number;
  ackTypeAmt: number;
  ackTypeAmtDisc: number;
  ackTypeAmtTax: number;
  ackTypeAmtRetTax: number;
  invTypeAmt: number;
  invTypeAmtDisc: number;
  invTypeAmtTax: number;
  invTypeAmtRetTax: number;
  radTypeAmt: number;
  radTypeAmtDisc: number;
  radTypeAmtTax: number;
  radTypeAmtRetTax: number;
  shpTypeAmt: number;
  shpTypeAmtDisc: number;
  shpTypeAmtTax: number;
  shpTypeAmtRetTax: number;
  dlvyTypeConvenio: string;
  dlvyCpny: string;
  shpTypeConvenio: string;
  shpCpny: string;
  invTypeConvenio: string;
  invCpny: string;
  radTypeConvenio: string;
  radCpny: string;
  ackTypeConvenio: string;
  ackCpny: string;
}

interface OtherServices {
  otherServices: OtherService[];
}

interface OtherService {
  id: string;
  idRef: string;
  description: string;
  aditionalData1: string;
  aditionalData2: string;
  cpny: string;
  amt: number;
  amtDisc: number;
  amtTax: number;
  amtRetTax: number;
}

interface Amount {
  shpAmnt: number;
  discAmnt: number;
  srvcAmnt: number;
  subTotlAmnt: number;
  taxAmnt: number;
  taxRetAmnt: number;
  totalAmnt: number;
}
