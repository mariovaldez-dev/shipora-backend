import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import { CreateShipmentDto } from '@modules/orders/application/dto';
import { CreateShipmentUseCase } from '@modules/orders/application/use-cases/create-shipment.use-case';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentController {
  constructor(private readonly createShipmentUseCase: CreateShipmentUseCase) {}

  @Post()
  async createShipment(@Body() dto: CreateShipmentDto, @Request() req: any) {
    if (!dto.orderId) {
      throw new BadRequestException('orderId is required');
    }
    if (!dto.carrier || !dto.trackingNumber || !dto.cost) {
      throw new BadRequestException(
        'carrier, trackingNumber, and cost are required',
      );
    }
    // Agregar userId al shipment
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID from JWT is required');
    }
    const shipment = await this.createShipmentUseCase.execute({
      ...dto,
      userId,
    });
    return {
      success: true,
      data: shipment,
      message: 'Shipment created and linked to order',
    };
  }
}
