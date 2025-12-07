export interface PaqueteExpressCreateShipmentRequest {
  header: Header;
  body: Body;
}

interface Header {
  security: Security;
}

interface Security {
  user: string;
  token: string;
  type: number;
}

interface Body {
  request: Request;
}

interface Request {
  data: Daum[];
}

interface Daum {
  billRad: string;
  billClntId: string;
  pymtMode: string;
  pymtType: string;
  comt: string;
  radGuiaAddrDTOList: RadGuiaAddrDtolist[];
  radSrvcItemDTOList: RadSrvcItemDTOList[];
  listSrvcItemDTO: ListSrvcItemDTO[];
  typeSrvcId: string;
  listRefs: References[];
}

export interface RadGuiaAddrDtolist {
  addrLin1: string;
  addrLin3: string;
  addrLin4: string;
  addrLin5: string;
  addrLin6: string;
  strtName: string;
  drnr: string;
  phno1: string;
  zipCode: string;
  clntName: string;
  rfc: string;
  email: string;
  contacto: string;
  addrType: string;
}

export interface RadSrvcItemDTOList {
  srvcId: string;
  productIdSAT: string;
  weight: string;
  volL: string;
  volW: string;
  volH: string;
  cont: string;
  qunt: string;
}
export interface ListSrvcItemDTO {
  srvcId: string;
  value1: string;
}

export interface References {
  grGuiaRefr: string;
}
