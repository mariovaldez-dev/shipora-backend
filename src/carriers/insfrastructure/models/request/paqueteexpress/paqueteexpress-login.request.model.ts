export interface PaqueteExpressLoginRequest {
  header: PEHeader;
}

export interface PEHeader {
  security: PESecurity;
}

export interface PESecurity {
  user: string;
  password: string;
}
