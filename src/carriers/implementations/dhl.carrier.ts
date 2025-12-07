import { Injectable, Logger } from '@nestjs/common';
import {
  IShippingCarrier,
  ShipmentRate,
  ShipmentDetails,
  TrackingInfo,
} from '../domain/carrier.interface';
import { GetRatesDto } from '../application/dto/request/get-rates.dto';
import { CreateShipmentRequestDto } from '../application/dto/request/create-shipments.request.dto';

/**
 * DHL Express Carrier Implementation
 *
 * This implementation provides integration with DHL Express shipping services.
 *
 * Features:
 * - Rate quotes for DHL Express services
 * - Label generation with PDF output
 * - Tracking with real-time shipment visibility
 * - Shipment cancellation
 *
 * DHL API Documentation: https://developer.dhl.com/api-reference/dhl-express-mydhl-api
 *
 * Required Environment Variables:
 * - DHL_API_KEY: Your DHL API key
 * - DHL_API_SECRET: Your DHL API secret
 * - DHL_ACCOUNT_NUMBER: Your DHL account number
 * - DHL_API_URL: DHL API base URL (production or sandbox)
 *
 * Service Types Available:
 * - Express Worldwide: Global express delivery
 * - Express 12:00: Delivery by noon
 * - Express 10:30: Delivery by 10:30 AM
 * - Express 9:00: Delivery by 9:00 AM
 * - Express Easy: Simplified express service
 * - Domestic Express: Domestic express within Mexico
 */

interface DHLRateRequest {
  accountNumber: string;
  originPostalCode: string;
  originCityName: string;
  originCountryCode: string;
  destinationPostalCode: string;
  destinationCityName: string;
  destinationCountryCode: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  plannedShippingDate: string;
  isCustomsDeclarable: boolean;
  unitOfMeasurement: string;
}

interface DHLShipmentRequest {
  plannedShippingDateAndTime: string;
  pickup: {
    isRequested: boolean;
  };
  productCode: string;
  accounts: Array<{
    typeCode: string;
    number: string;
  }>;
  customerDetails: {
    shipperDetails: {
      postalAddress: {
        postalCode: string;
        cityName: string;
        countryCode: string;
        addressLine1: string;
        stateOrProvinceCode?: string;
      };
      contactInformation: {
        phone: string;
        companyName?: string;
        fullName: string;
      };
    };
    receiverDetails: {
      postalAddress: {
        postalCode: string;
        cityName: string;
        countryCode: string;
        addressLine1: string;
        stateOrProvinceCode?: string;
      };
      contactInformation: {
        phone: string;
        companyName?: string;
        fullName: string;
      };
    };
  };
  content: {
    packages: Array<{
      weight: number;
      dimensions?: {
        length: number;
        width: number;
        height: number;
      };
    }>;
    isCustomsDeclarable: boolean;
    description: string;
    incoterm?: string;
    unitOfMeasurement: string;
  };
  outputImageProperties: {
    encodingFormat: string;
    imageOptions: Array<{
      typeCode: string;
      templateName?: string;
    }>;
  };
}

@Injectable()
export class DHLCarrier implements IShippingCarrier {
  readonly strategyKey = 'dhl';
  private readonly logger = new Logger(DHLCarrier.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly accountNumber: string;

  constructor() {
    this.apiUrl =
      process.env.DHL_API_URL || 'https://express.api.dhl.com/mydhlapi/test';
    this.apiKey = process.env.DHL_API_KEY || '';
    this.apiSecret = process.env.DHL_API_SECRET || '';
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER || '';

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn(
        'DHL credentials not configured. Carrier will not be available.',
      );
    }
  }

  /**
   * Get authorization header for DHL API (Basic Auth)
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.apiKey}:${this.apiSecret}`,
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Get shipping rates from DHL
   */
  async getRates(
    shipmentData: GetRatesDto,
    carrierKey: string,
  ): Promise<ShipmentRate[]> {
    this.logger.log('Getting DHL rates for:', shipmentData);

    try {
      const rates: ShipmentRate[] = [];

      for (const product of shipmentData.products) {
        const plannedDate = new Date();
        plannedDate.setDate(plannedDate.getDate() + 1); // Next day

        const params = new URLSearchParams({
          accountNumber: this.accountNumber,
          originPostalCode: shipmentData.from.zipCode,
          originCityName: shipmentData.from.city,
          originCountryCode: shipmentData.from.country || 'MX',
          destinationPostalCode: shipmentData.to.zipCode,
          destinationCityName: shipmentData.to.city,
          destinationCountryCode: shipmentData.to.country || 'MX',
          weight: String(product.dimensions.weight || 1),
          length: String(product.dimensions.length || 10),
          width: String(product.dimensions.width || 10),
          height: String(product.dimensions.height || 10),
          plannedShippingDate: plannedDate.toISOString().split('T')[0],
          isCustomsDeclarable: 'false',
          unitOfMeasurement: 'metric',
        });

        const response = await fetch(
          `${this.apiUrl}/rates?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          const error = await response.text();
          this.logger.error('DHL rate request failed:', error);
          continue;
        }

        const data = await response.json();

        // Map DHL response to our domain model
        if (data.products) {
          for (const productRate of data.products) {
            const totalPrice = productRate.totalPrice?.[0];

            rates.push({
              rateId: `dhl-${productRate.productCode}-${Date.now()}`,
              masterRateId: `master-dhl-${Date.now()}`,
              serviceName:
                productRate.productName ||
                this.mapProductCode(productRate.productCode),
              carrier: 'DHL',
              date: new Date(),
              origin: shipmentData.from,
              destination: shipmentData.to,
              total: totalPrice?.price || 0,
              subtotal: totalPrice?.price || 0,
              taxes: 0,
              currency: totalPrice?.priceCurrency || 'MXN',
              productInfo: [
                {
                  sku: product.sku || 'N/A',
                  name: product.name || 'Package',
                  quantity: product.quantity || 1,
                },
              ],
              estimatedDelivery:
                productRate.deliveryCapabilities?.deliveryTypeCode || 'TBD',
              estimatedDeliveryDays: this.calculateDeliveryDays(
                productRate.productCode,
              ),
              isPlusZone: false,
              quantity: product.quantity || 1,
              createdBy: shipmentData.userKey,
            });
          }
        }
      }

      this.logger.log(`Found ${rates.length} DHL rates`);
      return rates;
    } catch (error) {
      this.logger.error('Error getting DHL rates:', error);
      throw new Error('Failed to get DHL shipping rates');
    }
  }

  /**
   * Create a DHL shipment and generate label
   */
  async createShipment(
    shipmentData: CreateShipmentRequestDto,
    shipmentId: string,
  ): Promise<ShipmentDetails[]> {
    this.logger.log('Creating DHL shipment:', shipmentId);

    try {
      const shipmentDetails: ShipmentDetails[] = [];

      for (const product of shipmentData.products) {
        const plannedDateTime = new Date();
        plannedDateTime.setDate(plannedDateTime.getDate() + 1);

        const request: DHLShipmentRequest = {
          plannedShippingDateAndTime: plannedDateTime.toISOString(),
          pickup: {
            isRequested: false,
          },
          productCode: 'N', // Express Domestic (configurable)
          accounts: [
            {
              typeCode: 'shipper',
              number: this.accountNumber,
            },
          ],
          customerDetails: {
            shipperDetails: {
              postalAddress: {
                postalCode: shipmentData.from.zipCode,
                cityName: shipmentData.from.city,
                countryCode: shipmentData.from.country || 'MX',
                addressLine1: shipmentData.from.street,
                stateOrProvinceCode: shipmentData.from.state,
              },
              contactInformation: {
                phone: shipmentData.from.phone || '5555555555',
                companyName: '', // AddressDto doesn't have company field
                fullName: shipmentData.from.clientName,
              },
            },
            receiverDetails: {
              postalAddress: {
                postalCode: shipmentData.to.zipCode,
                cityName: shipmentData.to.city,
                countryCode: shipmentData.to.country || 'MX',
                addressLine1: shipmentData.to.street,
                stateOrProvinceCode: shipmentData.to.state,
              },
              contactInformation: {
                phone: shipmentData.to.phone || '5555555555',
                companyName: '', // AddressDto doesn't have company field
                fullName: shipmentData.to.clientName,
              },
            },
          },
          content: {
            packages: [
              {
                weight: product.dimensions.weight || 1,
                dimensions:
                  product.dimensions.length &&
                  product.dimensions.width &&
                  product.dimensions.height
                    ? {
                        length: product.dimensions.length,
                        width: product.dimensions.width,
                        height: product.dimensions.height,
                      }
                    : undefined,
              },
            ],
            isCustomsDeclarable: false,
            description: product.name || 'Package',
            incoterm: 'DAP',
            unitOfMeasurement: 'metric',
          },
          outputImageProperties: {
            encodingFormat: 'pdf',
            imageOptions: [
              {
                typeCode: 'label',
                templateName: 'ECOM26_84_001',
              },
            ],
          },
        };

        const response = await fetch(`${this.apiUrl}/shipments`, {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const error = await response.text();
          this.logger.error('DHL shipment creation failed:', error);
          throw new Error('Failed to create DHL shipment');
        }

        const data = await response.json();

        if (!data.shipmentTrackingNumber) {
          throw new Error('No tracking number returned from DHL');
        }

        const labelData = data.documents?.[0]?.content;

        shipmentDetails.push({
          masterTrackingNumber: data.shipmentTrackingNumber,
          trackingNumber: data.shipmentTrackingNumber,
          labelUrl: labelData
            ? `data:application/pdf;base64,${labelData}`
            : 'pending',
        });
      }

      this.logger.log(`Created ${shipmentDetails.length} DHL shipments`);
      return shipmentDetails;
    } catch (error) {
      this.logger.error('Error creating DHL shipment:', error);
      throw new Error('Failed to create DHL shipment');
    }
  }

  /**
   * Track a DHL shipment
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log('Tracking DHL shipment:', trackingNumber);

    try {
      const response = await fetch(
        `${this.apiUrl}/shipments/${trackingNumber}/tracking`,
        {
          method: 'GET',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error('DHL tracking request failed:', error);
        throw new Error('Failed to track DHL shipment');
      }

      const data = await response.json();
      const shipment = data.shipments?.[0];

      if (!shipment) {
        return {
          status: 'No disponible',
          history: [],
        };
      }

      const status = shipment.status?.description || 'Unknown';
      const history = (shipment.events || []).map((event: any) => ({
        location: event.location?.address?.addressLocality || 'N/A',
        status: event.description || 'N/A',
        timestamp: new Date(event.timestamp),
      }));

      return {
        status,
        history,
      };
    } catch (error) {
      this.logger.error('Error tracking DHL shipment:', error);
      throw new Error('Failed to track DHL shipment');
    }
  }

  /**
   * Cancel a DHL shipment
   */
  async cancelShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Cancelling DHL shipment:', trackingNumber);

    try {
      // DHL uses a different endpoint for pickup cancellation
      // For shipment cancellation, you typically need to contact DHL directly
      // This is a simplified implementation

      const response = await fetch(
        `${this.apiUrl}/shipments/${trackingNumber}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error('DHL cancellation failed:', error);
        return {
          success: false,
          message: 'Failed to cancel DHL shipment',
        };
      }

      return {
        success: true,
        message: 'DHL shipment cancelled successfully',
      };
    } catch (error) {
      this.logger.error('Error cancelling DHL shipment:', error);
      return {
        success: false,
        message: 'Error cancelling DHL shipment',
      };
    }
  }

  /**
   * Map DHL product codes to friendly names
   */
  private mapProductCode(productCode: string): string {
    const productMap: Record<string, string> = {
      N: 'DHL Express Domestic',
      P: 'DHL Express Worldwide',
      U: 'DHL Express Worldwide',
      Y: 'DHL Express 12:00',
      T: 'DHL Express 10:30',
      K: 'DHL Express 9:00',
      D: 'DHL Express Easy',
    };

    return productMap[productCode] || `DHL ${productCode}`;
  }

  /**
   * Estimate delivery days based on product code
   */
  private calculateDeliveryDays(productCode: string): number {
    const daysMap: Record<string, number> = {
      K: 1, // Express 9:00
      T: 1, // Express 10:30
      Y: 1, // Express 12:00
      N: 2, // Domestic Express
      P: 3, // Express Worldwide
      U: 3, // Express Worldwide
      D: 3, // Express Easy
    };

    return daysMap[productCode] || 3;
  }
}
