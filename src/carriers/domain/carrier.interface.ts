import { AddressDto } from '@modules/shipping/application/dto/address.dto';
import { GetRatesDto } from '../application/dto/request/get-rates.dto';

export interface ShipmentRate {
  rateId: string;
  masterRateId: string;
  serviceName: string;
  carrier: string;
  date: Date;
  origin: AddressDto;
  destination: AddressDto;
  total: number;
  subtotal: number;
  taxes: number;
  currency: string;
  productInfo: ProductInfo[];
  estimatedDelivery: Date | string;
  estimatedDeliveryDays: number;
  hasInvoiceSecure?: boolean;
  invoiceAmount?: number;
  ownTaxes?: number;
  isPlusZone: boolean;
  quantity: number;
  createdBy: string;
}

interface ProductInfo {
  sku: string;
  name: string;
  quantity: number;
}

export interface ShipmentDetails {
  masterTrackingNumber: string;
  trackingNumber: string;
  labelUrl: string;
}

export interface TrackingInfo {
  status: string;
  history: Array<{
    location: string;
    status: string;
    timestamp: Date;
  }>;
}

export const SHIPPING_CARRIER = 'SHIPPING_CARRIER';

export interface IShippingCarrier {
  readonly strategyKey: string;

  getRates(
    shipmentData: GetRatesDto,
    carrierKey: string,
  ): Promise<ShipmentRate[]>;

  createShipment(
    shipmentData: GetRatesDto,
    shipmentId: string,
  ): Promise<ShipmentDetails[]>;

  trackShipment(trackingNumber: string): Promise<TrackingInfo>;

  cancelShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean; message: string }>;
}
