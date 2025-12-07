export interface PaqueteExpressLoginResponse {
  header?: string;
  body: PELoginResponseBody;
}

interface PELoginResponseBody {
  request?: object;
  response: PEBodyResponse;
}

interface PEBodyResponse {
  success: boolean;
  messages: Messages[];
  data: Data;
  objectDTO?: object;
  time: string;
}

interface Messages {
  ode: string;
  description: string;
  typeError: string;
}

interface Data {
  token: string;
}
