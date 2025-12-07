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
 * FedEx Carrier Implementation
 *
 * This implementation provides integration with FedEx shipping services.
 *
 * Features:
 * - Rate quotes for multiple service types (Express, Ground, International)
 * - Label generation with PDF output
 * - Tracking with real-time status updates
 * - Shipment cancellation (void)
 *
 * FedEx API Documentation: https://developer.fedex.com/api/en-us/home.html
 *
 * Required Environment Variables:
 * - FEDEX_API_KEY: Your FedEx API key
 * - FEDEX_SECRET_KEY: Your FedEx secret key
 * - FEDEX_ACCOUNT_NUMBER: Your FedEx account number
 * - FEDEX_METER_NUMBER: Your FedEx meter number
 * - FEDEX_API_URL: FedEx API base URL (production or sandbox)
 *
 * Service Types Available:
 * - FEDEX_GROUND: Ground shipping
 * - FEDEX_EXPRESS_SAVER: Express Saver (3 day)
 * - FEDEX_2_DAY: 2 Day shipping
 * - FEDEX_STANDARD_OVERNIGHT: Standard Overnight
 * - FEDEX_PRIORITY_OVERNIGHT: Priority Overnight
 * - INTERNATIONAL_ECONOMY: International Economy
 * - INTERNATIONAL_PRIORITY: International Priority
 */

interface FedExAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FedExRateRequest {
  accountNumber: {
    value: string;
  };
  requestedShipment: {
    shipper: {
      address: {
        postalCode: string;
        countryCode: string;
        city?: string;
        stateOrProvinceCode?: string;
      };
    };
    recipient: {
      address: {
        postalCode: string;
        countryCode: string;
        city?: string;
        stateOrProvinceCode?: string;
      };
    };
    pickupType: string;
    rateRequestType: string[];
    requestedPackageLineItems: Array<{
      weight: {
        units: string;
        value: number;
      };
      dimensions?: {
        length: number;
        width: number;
        height: number;
        units: string;
      };
    }>;
  };
}

interface FedExShipmentRequest {
  accountNumber: {
    value: string;
  };
  requestedShipment: {
    shipper: {
      contact: {
        personName: string;
        phoneNumber: string;
        companyName?: string;
      };
      address: {
        streetLines: string[];
        city: string;
        stateOrProvinceCode: string;
        postalCode: string;
        countryCode: string;
      };
    };
    recipients: Array<{
      contact: {
        personName: string;
        phoneNumber: string;
        companyName?: string;
      };
      address: {
        streetLines: string[];
        city: string;
        stateOrProvinceCode: string;
        postalCode: string;
        countryCode: string;
      };
    }>;
    serviceType: string;
    pickupType: string;
    packagingType: string;
    shippingChargesPayment: {
      paymentType: string;
    };
    labelSpecification: {
      labelFormatType: string;
      imageType: string;
      labelStockType: string;
    };
    requestedPackageLineItems: Array<{
      weight: {
        units: string;
        value: number;
      };
      dimensions?: {
        length: number;
        width: number;
        height: number;
        units: string;
      };
    }>;
  };
}

@Injectable()
export class FedExCarrier implements IShippingCarrier {
  readonly strategyKey = 'fedex';
  private readonly logger = new Logger(FedExCarrier.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly accountNumber: string;
  private readonly meterNumber: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.apiUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com';
    this.apiKey = process.env.FEDEX_API_KEY || '';
    this.secretKey = process.env.FEDEX_SECRET_KEY || '';
    this.accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || '';
    this.meterNumber = process.env.FEDEX_METER_NUMBER || '';

    if (!this.apiKey || !this.secretKey) {
      this.logger.warn(
        'FedEx credentials not configured. Carrier will not be available.',
      );
    }
  }

  /**
   * Authenticate with FedEx OAuth 2.0
   */
  private async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      this.logger.log('Authenticating with FedEx API');

      const response = await fetch(`${this.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`FedEx authentication failed: ${error}`);
      }

      const data = (await response.json()) as FedExAuthResponse;
      this.accessToken = data.access_token;

      // Set expiry to 5 minutes before actual expiry for safety
      const expiryMs = (data.expires_in - 300) * 1000;
      this.tokenExpiry = new Date(Date.now() + expiryMs);

      this.logger.log('FedEx authentication successful');
      return this.accessToken;
    } catch (error) {
      this.logger.error('FedEx authentication error:', error);
      throw new Error('Failed to authenticate with FedEx API');
    }
  }

  /**
   * Get shipping rates from FedEx
   */
  async getRates(
    shipmentData: GetRatesDto,
    carrierKey: string,
  ): Promise<ShipmentRate[]> {
    this.logger.log('Getting FedEx rates for:', shipmentData);

    try {
      const token = await this.authenticate();
      const rates: ShipmentRate[] = [];

      for (const product of shipmentData.products) {
        const request: FedExRateRequest = {
          accountNumber: {
            value: this.accountNumber,
          },
          requestedShipment: {
            shipper: {
              address: {
                postalCode: shipmentData.from.zipCode,
                countryCode: shipmentData.from.country || 'MX',
                city: shipmentData.from.city,
                stateOrProvinceCode: shipmentData.from.state,
              },
            },
            recipient: {
              address: {
                postalCode: shipmentData.to.zipCode,
                countryCode: shipmentData.to.country || 'MX',
                city: shipmentData.to.city,
                stateOrProvinceCode: shipmentData.to.state,
              },
            },
            pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
            rateRequestType: ['ACCOUNT', 'LIST'],
            requestedPackageLineItems: [
              {
                weight: {
                  units: 'KG',
                  value: product.dimensions.weight || 1,
                },
                dimensions:
                  product.dimensions.length &&
                  product.dimensions.width &&
                  product.dimensions.height
                    ? {
                        length: product.dimensions.length,
                        width: product.dimensions.width,
                        height: product.dimensions.height,
                        units: 'CM',
                      }
                    : undefined,
              },
            ],
          },
        };

        const response = await fetch(`${this.apiUrl}/rate/v1/rates/quotes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-locale': 'es_MX',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const error = await response.text();
          this.logger.error('FedEx rate request failed:', error);
          continue;
        }

        const data = await response.json();

        // Map FedEx response to our domain model
        if (data.output?.rateReplyDetails) {
          for (const rateDetail of data.output.rateReplyDetails) {
            const ratedShipment = rateDetail.ratedShipmentDetails?.[0];
            if (!ratedShipment) continue;

            const totalCharge =
              ratedShipment.totalNetCharge || ratedShipment.totalNetFedExCharge;

            rates.push({
              rateId: `fedex-${rateDetail.serviceType}-${Date.now()}`,
              masterRateId: `master-fedex-${Date.now()}`,
              serviceName: this.mapServiceType(rateDetail.serviceType),
              carrier: 'FedEx',
              date: new Date(),
              origin: shipmentData.from,
              destination: shipmentData.to,
              total: totalCharge?.amount || 0,
              subtotal: totalCharge?.amount || 0,
              taxes: 0,
              currency: totalCharge?.currency || 'MXN',
              productInfo: [
                {
                  sku: product.sku || 'N/A',
                  name: product.name || 'Package',
                  quantity: product.quantity || 1,
                },
              ],
              estimatedDelivery:
                rateDetail.commit?.dateDetail?.dayFormat || 'TBD',
              estimatedDeliveryDays: this.calculateDeliveryDays(
                rateDetail.serviceType,
              ),
              isPlusZone: false,
              quantity: product.quantity || 1,
              createdBy: shipmentData.userKey,
            });
          }
        }
      }

      this.logger.log(`Found ${rates.length} FedEx rates`);
      return rates;
    } catch (error) {
      this.logger.error('Error getting FedEx rates:', error);
      throw new Error('Failed to get FedEx shipping rates');
    }
  }

  /**
   * Create a FedEx shipment and generate label
   */
  async createShipment(
    shipmentData: CreateShipmentRequestDto,
    shipmentId: string,
  ): Promise<ShipmentDetails[]> {
    this.logger.log('Creating FedEx shipment:', shipmentId);

    try {
      const token = await this.authenticate();
      const shipmentDetails: ShipmentDetails[] = [];

      for (const product of shipmentData.products) {
        const request: FedExShipmentRequest = {
          accountNumber: {
            value: this.accountNumber,
          },
          requestedShipment: {
            shipper: {
              contact: {
                personName: shipmentData.from.clientName,
                phoneNumber: shipmentData.from.phone || '5555555555',
                companyName: '', // AddressDto doesn't have company field
              },
              address: {
                streetLines: [shipmentData.from.street],
                city: shipmentData.from.city,
                stateOrProvinceCode: shipmentData.from.state,
                postalCode: shipmentData.from.zipCode,
                countryCode: shipmentData.from.country || 'MX',
              },
            },
            recipients: [
              {
                contact: {
                  personName: shipmentData.to.clientName,
                  phoneNumber: shipmentData.to.phone || '5555555555',
                  companyName: '', // AddressDto doesn't have company field
                },
                address: {
                  streetLines: [shipmentData.to.street],
                  city: shipmentData.to.city,
                  stateOrProvinceCode: shipmentData.to.state,
                  postalCode: shipmentData.to.zipCode,
                  countryCode: shipmentData.to.country || 'MX',
                },
              },
            ],
            serviceType: 'FEDEX_GROUND', // Default service, should be configurable
            pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
            packagingType: 'YOUR_PACKAGING',
            shippingChargesPayment: {
              paymentType: 'SENDER',
            },
            labelSpecification: {
              labelFormatType: 'COMMON2D',
              imageType: 'PDF',
              labelStockType: 'PAPER_4X6',
            },
            requestedPackageLineItems: [
              {
                weight: {
                  units: 'KG',
                  value: product.dimensions.weight || 1,
                },
                dimensions:
                  product.dimensions.length &&
                  product.dimensions.width &&
                  product.dimensions.height
                    ? {
                        length: product.dimensions.length,
                        width: product.dimensions.width,
                        height: product.dimensions.height,
                        units: 'CM',
                      }
                    : undefined,
              },
            ],
          },
        };

        const response = await fetch(`${this.apiUrl}/ship/v1/shipments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-locale': 'es_MX',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const error = await response.text();
          this.logger.error('FedEx shipment creation failed:', error);
          throw new Error('Failed to create FedEx shipment');
        }

        const data = await response.json();
        const shipmentOutput = data.output?.transactionShipments?.[0];

        if (!shipmentOutput) {
          throw new Error('No shipment data returned from FedEx');
        }

        const trackingNumber =
          shipmentOutput.masterTrackingNumber ||
          shipmentOutput.pieceResponses?.[0]?.trackingNumber;
        const labelData =
          shipmentOutput.pieceResponses?.[0]?.packageDocuments?.[0];

        shipmentDetails.push({
          masterTrackingNumber: shipmentOutput.masterTrackingNumber,
          trackingNumber: trackingNumber,
          labelUrl: labelData?.url || 'pending',
        });
      }

      this.logger.log(`Created ${shipmentDetails.length} FedEx shipments`);
      return shipmentDetails;
    } catch (error) {
      this.logger.error('Error creating FedEx shipment:', error);
      throw new Error('Failed to create FedEx shipment');
    }
  }

  /**
   * Track a FedEx shipment
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log('Tracking FedEx shipment:', trackingNumber);

    try {
      const token = await this.authenticate();

      const response = await fetch(`${this.apiUrl}/track/v1/trackingnumbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-locale': 'es_MX',
        },
        body: JSON.stringify({
          includeDetailedScans: true,
          trackingInfo: [
            {
              trackingNumberInfo: {
                trackingNumber: trackingNumber,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error('FedEx tracking request failed:', error);
        throw new Error('Failed to track FedEx shipment');
      }

      const data = await response.json();
      const trackingResult =
        data.output?.completeTrackResults?.[0]?.trackResults?.[0];

      if (!trackingResult) {
        return {
          status: 'No disponible',
          history: [],
        };
      }

      const status =
        trackingResult.latestStatusDetail?.description || 'Unknown';
      const history = (trackingResult.scanEvents || []).map((event: any) => ({
        location:
          `${event.scanLocation?.city || ''}, ${event.scanLocation?.stateOrProvinceCode || ''}`.trim(),
        status: event.eventDescription || 'N/A',
        timestamp: new Date(event.date),
      }));

      return {
        status,
        history,
      };
    } catch (error) {
      this.logger.error('Error tracking FedEx shipment:', error);
      throw new Error('Failed to track FedEx shipment');
    }
  }

  /**
   * Cancel a FedEx shipment (void)
   */
  async cancelShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Cancelling FedEx shipment:', trackingNumber);

    try {
      const token = await this.authenticate();

      const response = await fetch(`${this.apiUrl}/ship/v1/shipments/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-locale': 'es_MX',
        },
        body: JSON.stringify({
          accountNumber: {
            value: this.accountNumber,
          },
          trackingNumber: trackingNumber,
          deletionControl: 'DELETE_ALL_PACKAGES',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error('FedEx cancellation failed:', error);
        return {
          success: false,
          message: 'Failed to cancel FedEx shipment',
        };
      }

      return {
        success: true,
        message: 'FedEx shipment cancelled successfully',
      };
    } catch (error) {
      this.logger.error('Error cancelling FedEx shipment:', error);
      return {
        success: false,
        message: 'Error cancelling FedEx shipment',
      };
    }
  }

  /**
   * Map FedEx service type codes to friendly names
   */
  private mapServiceType(serviceType: string): string {
    const serviceMap: Record<string, string> = {
      FEDEX_GROUND: 'FedEx Ground',
      FEDEX_EXPRESS_SAVER: 'FedEx Express Saver',
      FEDEX_2_DAY: 'FedEx 2 Day',
      FEDEX_2_DAY_AM: 'FedEx 2 Day A.M.',
      STANDARD_OVERNIGHT: 'FedEx Standard Overnight',
      PRIORITY_OVERNIGHT: 'FedEx Priority Overnight',
      FIRST_OVERNIGHT: 'FedEx First Overnight',
      INTERNATIONAL_ECONOMY: 'FedEx International Economy',
      INTERNATIONAL_PRIORITY: 'FedEx International Priority',
      INTERNATIONAL_FIRST: 'FedEx International First',
    };

    return serviceMap[serviceType] || serviceType;
  }

  /**
   * Estimate delivery days based on service type
   */
  private calculateDeliveryDays(serviceType: string): number {
    const daysMap: Record<string, number> = {
      PRIORITY_OVERNIGHT: 1,
      STANDARD_OVERNIGHT: 1,
      FIRST_OVERNIGHT: 1,
      FEDEX_2_DAY: 2,
      FEDEX_2_DAY_AM: 2,
      FEDEX_EXPRESS_SAVER: 3,
      FEDEX_GROUND: 5,
      INTERNATIONAL_PRIORITY: 3,
      INTERNATIONAL_ECONOMY: 7,
      INTERNATIONAL_FIRST: 1,
    };

    return daysMap[serviceType] || 5;
  }
}
