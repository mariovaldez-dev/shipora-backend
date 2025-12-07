import utils from '@core/shared/utils';
import { AddressDto } from '@modules/shipping/application/dto/address.dto';
import { ProductDto } from '@modules/shipping/application/dto/product.dto';
import { PaqueteExpressRateRequest } from '../../models/request/paqueteexpress/paqueteexpress-rate.request.model';

export function PaqueteExpressRateRequestMapper(
  addressFrom: AddressDto,
  addressTo: AddressDto,
  product: ProductDto,
): PaqueteExpressRateRequest {
  const { user, passwordQuotation, token } =
    utils.getPqExpressGuideCredentials();

  const quotationPERequest: PaqueteExpressRateRequest = {
    header: {
      security: {
        user: user,
        password: passwordQuotation,
        token: token,
        type: 1,
      },
      device: {
        appName: 'Customer',
        type: 'Web',
        ip: '',
        idDevice: '',
      },
      target: {
        module: 'QUOTER',
        version: '1.0',
        service: 'quoter',
        uri: 'quotes',
        event: 'R',
      },
      output: 'JSON',
      language: null,
    },
    body: {
      request: {
        data: {
          clientAddrOrig: {
            zipCode: addressFrom.zipCode,
            colonyName: addressFrom.colony,
          },
          clientAddrDest: {
            zipCode: addressTo.zipCode,
            colonyName: addressTo.colony,
          },
          services: {
            dlvyType: '1',
            ackType: 'N',
            totlDeclVlue: 0,
            invType: 'N',
            radType: '1',
          },
          shipmentDetail: {
            shipments: [
              {
                sequence: 1,
                quantity: product.quantity,
                shpCode: '3',
                weight: Math.round(product.dimensions.volume) || 30,
                longShip: Math.round(product.dimensions.length) || 30,
                widthShip: Math.round(product.dimensions.width) || 25,
                highShip: Math.round(product.dimensions.height) || 40,
              },
            ],
          },
          quoteServices: ['ST'],
          otherServices: {
            otherServices: [],
          },
        },
        objectDTO: undefined,
      },
      response: undefined,
    },
  };

  return quotationPERequest;
}
