import { AddressDto } from '@modules/shipping/application/dto/address.dto';
import { PaqueteExpressCreateShipmentRequest } from '../../models/request/paqueteexpress/paqueteexpress-create-shipment.request';
import { ProductDto } from '@modules/shipping/application/dto/product.dto';
import utils from '@modules/core/shared/utils';

export function PaqueteExpressShipmentMapper(
  user: string,
  token: string,
  client: string,
  from: AddressDto,
  to: AddressDto,
  product: ProductDto,
): PaqueteExpressCreateShipmentRequest {
  const listServices = [
    {
      srvcId: 'RAD',
      value1: '',
    },
    {
      srvcId: 'EAD',
      value1: '',
    },
  ];
  if (product.requireAssurance) {
    listServices.push({
      srvcId: 'INV',
      value1: (product.insuranceValue ?? 0 / product.quantity).toString(),
    });
  }

  return {
    header: {
      security: {
        user: user,
        token: token,
        type: 0,
      },
    },
    body: {
      request: {
        data: [
          {
            billRad: 'REQUEST',
            billClntId: client,
            pymtMode: 'PAID',
            pymtType: 'C',
            comt: '',
            radGuiaAddrDTOList: [
              //origin
              {
                addrLin1: from.country,
                addrLin3: from.state,
                addrLin4: from.city,
                addrLin5: from.municipality,
                addrLin6: from.colony,
                strtName: from.street,
                drnr: from.number,
                phno1: from.phone,
                zipCode: from.zipCode,
                clntName: from.clientName ?? 'SHIPORA',
                rfc: from.rfc ?? 'XXAX010101000',
                email: 'atencionalcliente@shipora.com.mx',
                contacto: from.clientName ?? 'SHIPORA',
                addrType: 'ORIGIN',
              },
              //destination
              {
                addrLin1: to.country,
                addrLin3: to.state,
                addrLin4: to.city,
                addrLin5: to.municipality,
                addrLin6: to.colony,
                strtName: to.street,
                drnr: to.number,
                phno1: to.phone,
                zipCode: to.zipCode,
                clntName: to.clientName ?? '',
                rfc: to.rfc ?? 'XXAX010101000',
                email: to.email ?? 'atencionalcliente@shipora.com.mx',
                contacto: to.clientName ?? 'SHIPORA',
                addrType: 'DESTINATION',
              },
            ],
            radSrvcItemDTOList: [
              {
                srvcId: 'PACKETS',
                productIdSAT: '01010101',
                weight: utils
                  .getVolumen(
                    product.dimensions.weight,
                    product.dimensions.volume,
                  )
                  .toString(),
                volL: product.dimensions.length.toString(),
                volW: product.dimensions.width.toString(),
                volH: product.dimensions.height.toString(),
                cont: utils.getGuideReference(to.reference ?? product.name, 65),
                qunt: '1',
              },
            ],
            listSrvcItemDTO: listServices,
            typeSrvcId: 'STD-T',
            listRefs: [
              {
                grGuiaRefr: `${product.sku}`,
              },
            ],
          },
        ],
      },
    },
  };
}
