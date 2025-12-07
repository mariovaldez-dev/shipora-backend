import { ProductDto } from '@modules/shipping/application/dto/product.dto.js';
import { PaqueteExpressRateResponseModel } from '../models/response/paqueteexpress/paqueteexpress-rate.response.model.ts';
import { v4 as uuidv4 } from 'uuid';
import { AddressDto } from '@modules/shipping/application/dto/address.dto.js';
import { ShipmentRate } from '@modules/carriers/domain/carrier.interface.js';
export function PaqueteExpressToRateResponseMapper(
  response: PaqueteExpressRateResponseModel,
  product: ProductDto,
  addressFrom: AddressDto,
  addressTo: AddressDto,
  masterRateId: string,
  createdBy: string,
  carrierKey: string,
): ShipmentRate {
  return {
    rateId: uuidv4(),
    masterRateId: masterRateId,
    carrier: carrierKey,
    date: new Date(),
    origin: addressFrom,
    destination: addressTo,
    total: response.body.response.data.quotations[0].amount.totalAmnt,
    subtotal: response.body.response.data.quotations[0].amount.subTotlAmnt,
    taxes: response.body.response.data.quotations[0].amount.taxAmnt,
    estimatedDelivery: response.body.response.data.quotations[0].promiseDate,
    estimatedDeliveryDays:
      response.body.response.data.quotations[0].promiseDateDaysQty,
    serviceName: response.body.response.data.quotations[0].serviceName,
    productInfo: [
      {
        sku: product.sku,
        name: product.name,
        quantity: product.quantity,
      },
    ],
    hasInvoiceSecure: false,
    invoiceAmount: 0,
    ownTaxes: 0,
    isPlusZone:
      response.body.response.data.clientAddrDest.branch.includes('70'),
    createdBy: createdBy,
    currency: 'MXN',
    quantity: product.quantity,
  };
}
