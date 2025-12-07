export interface PaqueteExpressRateRequest {
  header: Header;
  body: Body;
}

interface Header {
  security: Security;
  device: Device;
  target: Target;
  output: 'JSON';
  language: null;
}

interface Security {
  user: string;
  password: string;
  type: number;
  token: string;
}

interface Device {
  appName: 'Customer';
  type: 'Web';
  ip: '';
  idDevice: '';
}

interface Target {
  module: 'QUOTER';
  version: '1.0';
  service: 'quoter';
  uri: 'quotes';
  event: 'R';
}

interface Body {
  request: Request;
  response?: object;
}

interface Request {
  data: Data;
  objectDTO?: object;
}

interface Data {
  clientAddrOrig: ClientAddr;
  clientAddrDest: ClientAddr;
  services: Services;
  otherServices: OtherServices;
  shipmentDetail: ShipmentDetail;
  quoteServices: ['ALL' | 'ST'];
}

interface ClientAddr {
  zipCode: string;
  colonyName: string;
}

export interface Services {
  dlvyType: string;
  ackType: string;
  totlDeclVlue: number;
  invType: string;
  radType: string;
}

interface OtherServices {
  otherServices: object[];
}

interface ShipmentDetail {
  shipments: Shipments[];
}

export interface Shipments {
  sequence: number;
  quantity: number;
  shpCode: string;
  weight: number;
  longShip: number;
  widthShip: number;
  highShip: number;
}
