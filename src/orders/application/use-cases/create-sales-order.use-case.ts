import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ISalesOrderRepository } from '../../domain/repositories/sales-order.repository.interface';
import { SALES_ORDER_REPOSITORY } from '../../domain/repositories/constants';
import type { CreateSalesOrderCommand } from '@modules/orders/application/dto';
import { CreateGuideUseCase } from '@modules/guides/application/use-cases/create-guide.use-case';
import { ShippingService } from '@modules/carriers/application/services/shipping.service';
import { CreateShipmentRequestDto } from '@modules/carriers/application/dto/request/create-shipments.request.dto';

@Injectable()
export class CreateSalesOrderUseCase {
  private readonly logger = new Logger(CreateSalesOrderUseCase.name);

  constructor(
    @Inject(SALES_ORDER_REPOSITORY)
    private readonly salesOrderRepository: ISalesOrderRepository,
    private readonly createGuideUseCase: CreateGuideUseCase,
    private readonly shippingService: ShippingService,
  ) {}

  async execute(dto: CreateSalesOrderCommand) {
    this.logger.log(`Creating sales order for user: ${dto.userId}`);

    // Extract rateMasterId from dto or metadata
    const rateMasterId =
      dto.rateMasterId || dto.metadata?.rateMasterId || undefined;

    if (rateMasterId) {
      this.logger.log(`Order linked to rate query: ${rateMasterId}`);
    }

    // Create the order with rateMasterId
    const orderData = {
      ...dto,
      rateMasterId,
    };

    const order = await this.salesOrderRepository.create(orderData as any);
    this.logger.log(`Order created with ID: ${order._id}`);

    // Generate guide and shipment if carrier is selected
    const carrierCode =
      dto.metadata?.selectedCarrier ||
      order.selectedCarrier ||
      order.preferredCarrier ||
      'paqueteexpress';

    let totalShippingCost = 0;
    const shipmentIds: string[] = [];

    try {
      // Prepare shipment data
      const shipmentData: CreateShipmentRequestDto = {
        from: {
          country: dto.shippingFrom.country || 'MX',
          state: dto.shippingFrom.state,
          city: dto.shippingFrom.city,
          municipality: dto.shippingFrom.city,
          colony: dto.shippingFrom.neighborhood || '',
          street: dto.shippingFrom.street,
          number: dto.shippingFrom.exteriorNumber || '',
          phone: dto.shippingFrom.phone,
          zipCode: dto.shippingFrom.zipCode || dto.shippingFrom.postalCode,
          clientName:
            dto.shippingFrom.name ||
            `${dto.shippingFrom.firstName || ''} ${dto.shippingFrom.lastName || ''}`.trim(),
          reference: dto.shippingFrom.reference,
          rfc: '',
          email: dto.shippingFrom.email,
          contactName:
            dto.shippingFrom.name ||
            `${dto.shippingFrom.firstName || ''} ${dto.shippingFrom.lastName || ''}`.trim(),
          addressType: 'ORIGIN',
        },
        to: {
          country: dto.shippingTo.country || 'MX',
          state: dto.shippingTo.state,
          city: dto.shippingTo.city,
          municipality: dto.shippingTo.city,
          colony: dto.shippingTo.neighborhood || '',
          street: dto.shippingTo.street,
          number: dto.shippingTo.exteriorNumber || '',
          phone: dto.shippingTo.phone,
          zipCode: dto.shippingTo.zipCode || dto.shippingTo.postalCode,
          clientName:
            dto.shippingTo.name ||
            `${dto.shippingTo.firstName || ''} ${dto.shippingTo.lastName || ''}`.trim(),
          reference: dto.shippingTo.reference,
          rfc: '',
          email: dto.shippingTo.email,
          contactName:
            dto.shippingTo.name ||
            `${dto.shippingTo.firstName || ''} ${dto.shippingTo.lastName || ''}`.trim(),
          addressType: 'DESTINATION',
        },
        products: dto.items.map((item) => ({
          sku: item.sku || `ITEM-${Date.now()}`,
          name: item.name || item.description || 'Product',
          quantity: item.quantity || 1,
          dimensions: {
            length: item.length || 10,
            width: item.width || 10,
            height: item.height || 10,
            weight: item.weight || 1,
            volume:
              (item.length || 10) * (item.width || 10) * (item.height || 10),
          },
          value: item.value || item.declaredValue || 100,
          currency: 'MXN',
          requireAssurance: false,
          satcode: item.satCode || '01010101',
        })),
        rates: [], // Empty for now, will be populated if needed
        userKey: dto.userId,
      };

      // Create shipment with the carrier
      const shipmentDetails = await this.shippingService.createShipment(
        carrierCode,
        shipmentData as any,
      );

      // Use the first shipment detail to create the guide
      if (shipmentDetails && shipmentDetails.length > 0) {
        const firstShipment = shipmentDetails[0];

        // Calculate weights
        const totalWeight = dto.items.reduce(
          (sum, item) => sum + (item.weight || 0) * (item.quantity || 1),
          0,
        );
        const maxLength = Math.max(...dto.items.map((i) => i.length || 10));
        const maxWidth = Math.max(...dto.items.map((i) => i.width || 10));
        const maxHeight = Math.max(...dto.items.map((i) => i.height || 10));
        const volumetricWeight = (maxLength * maxWidth * maxHeight) / 5000;
        const chargeableWeight = Math.max(totalWeight, volumetricWeight);

        // Calculate total value
        const totalValue = dto.items.reduce(
          (sum, item) =>
            sum +
            (item.value || item.declaredValue || 0) * (item.quantity || 1),
          0,
        );

        // Get shipping cost from metadata or calculate default
        const shippingCost =
          dto.metadata?.shippingCost || dto.metadata?.selectedRate?.total || 0;
        totalShippingCost = shippingCost;

        const guideData = {
          userId: dto.userId,
          orderId: order._id.toString(),
          trackingNumber:
            firstShipment.masterTrackingNumber || firstShipment.trackingNumber,
          carrierTrackingNumber: firstShipment.trackingNumber,
          carrier: {
            id: carrierCode.toLowerCase(),
            name: this.getCarrierName(carrierCode),
            serviceType: dto.metadata?.serviceType || 'STANDARD',
          },
          origin: {
            companyName: dto.shippingFrom.company || '',
            contactName:
              dto.shippingFrom.name ||
              `${dto.shippingFrom.firstName || ''} ${dto.shippingFrom.lastName || ''}`.trim() ||
              'Sin nombre',
            email: dto.shippingFrom.email || '',
            phone: dto.shippingFrom.phone || '',
            street: dto.shippingFrom.street || '',
            exteriorNumber: dto.shippingFrom.exteriorNumber || 'S/N',
            interiorNumber: dto.shippingFrom.interiorNumber,
            neighborhood: dto.shippingFrom.neighborhood || '',
            city: dto.shippingFrom.city || '',
            state: dto.shippingFrom.state || '',
            zipCode:
              dto.shippingFrom.zipCode || dto.shippingFrom.postalCode || '',
            country: dto.shippingFrom.country || 'MX',
            reference: dto.shippingFrom.reference,
          },
          destination: {
            companyName: dto.shippingTo.company || '',
            contactName:
              dto.shippingTo.name ||
              `${dto.shippingTo.firstName || ''} ${dto.shippingTo.lastName || ''}`.trim() ||
              'Sin nombre',
            email: dto.shippingTo.email || '',
            phone: dto.shippingTo.phone || '',
            street: dto.shippingTo.street || '',
            exteriorNumber: dto.shippingTo.exteriorNumber || 'S/N',
            interiorNumber: dto.shippingTo.interiorNumber,
            neighborhood: dto.shippingTo.neighborhood || '',
            city: dto.shippingTo.city || '',
            state: dto.shippingTo.state || '',
            zipCode: dto.shippingTo.zipCode || dto.shippingTo.postalCode || '',
            country: dto.shippingTo.country || 'MX',
            reference: dto.shippingTo.reference,
          },
          products: dto.items.map((item) => ({
            sku: item.sku || `ITEM-${Date.now()}`,
            name: item.name || item.description || 'Product',
            quantity: item.quantity || 1,
            weight: item.weight || 1,
            dimensions: {
              length: item.length || 10,
              width: item.width || 10,
              height: item.height || 10,
              unit: 'CM',
            },
            value: item.value || item.declaredValue || 100,
            description: item.description,
          })),
          weight: totalWeight,
          volumetricWeight,
          chargeableWeight,
          dimensions: {
            length: maxLength || 10,
            width: maxWidth || 10,
            height: maxHeight || 10,
            unit: 'CM',
          },
          pricing: {
            basePrice: totalValue,
            insurance: 0,
            fuel: 0,
            handling: 0,
            total: totalValue + shippingCost,
            currency: 'MXN',
          },
          labelUrl: firstShipment.labelUrl,
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        };

        this.logger.log(
          `Creating guide with tracking: ${firstShipment.masterTrackingNumber || firstShipment.trackingNumber}`,
        );
        const guide = await this.createGuideUseCase.execute(guideData as any);
        this.logger.log(`Guide created successfully with ID: ${guide._id}`);

        // Update order with carrier info and shipping cost
        await this.salesOrderRepository.update(order._id.toString(), {
          selectedCarrier: carrierCode.toLowerCase(),
          shippingCost: totalShippingCost,
          shipmentIds: [firstShipment.masterTrackingNumber],
        });
        this.logger.log(
          `Order updated with shipment ID: ${firstShipment.masterTrackingNumber}`,
        );
      }
    } catch (error) {
      // Log error with full details
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `Error creating guide/shipment for order ${order._id}: ${errorMessage}`,
      );
      this.logger.error(`Stack trace: ${errorStack}`);
    }

    // Fetch updated order with all data
    const updatedOrder = await this.salesOrderRepository.findById(
      order._id.toString(),
    );
    return updatedOrder || order;
  }

  private getCarrierName(carrierCode: string): string {
    const carrierNames: Record<string, string> = {
      paqueteexpress: 'PaquetExpress',
      fedex: 'FedEx',
      dhl: 'DHL Express',
      ups: 'UPS',
      estafeta: 'Estafeta',
      shipora: 'Shipora',
    };
    return carrierNames[carrierCode.toLowerCase()] || carrierCode;
  }
}
