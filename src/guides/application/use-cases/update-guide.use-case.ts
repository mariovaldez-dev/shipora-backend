import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IGuideRepository } from '../../domain/repositories/guide.repository.interface';
import { GUIDE_REPOSITORY } from '../../domain/repositories/constants';
import { GuideStatus } from '../../entities/guide.entity';

@Injectable()
export class UpdateGuideUseCase {
  constructor(
    @Inject(GUIDE_REPOSITORY)
    private readonly guideRepository: IGuideRepository,
  ) {}

  async updateStatus(id: string, status: GuideStatus, reason?: string) {
    const guide = await this.guideRepository.updateStatus(id, status, { reason });
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }

    const statusMessages: Record<GuideStatus, string> = {
      [GuideStatus.PENDING]: 'Guía pendiente de procesamiento',
      [GuideStatus.LABEL_CREATED]: 'Etiqueta de envío generada',
      [GuideStatus.PICKED_UP]: 'Paquete recolectado por el transportista',
      [GuideStatus.IN_TRANSIT]: 'Paquete en tránsito hacia destino',
      [GuideStatus.OUT_FOR_DELIVERY]: 'Paquete en camino para entrega',
      [GuideStatus.DELIVERED]: 'Paquete entregado exitosamente',
      [GuideStatus.RETURNED]: 'Paquete devuelto al remitente',
      [GuideStatus.CANCELLED]: reason || 'Envío cancelado',
      [GuideStatus.EXCEPTION]: 'Excepción en el envío',
    };

    await this.guideRepository.addTrackingEvent(id, {
      status: status,
      location: guide.destination?.city || 'N/A',
      description: statusMessages[status],
    });

    return guide;
  }

  async updatePriority(id: string, priority: string) {
    const guide = await this.guideRepository.updatePriority(id, priority);
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    return guide;
  }

  async markAsPrinted(id: string, printedBy: string) {
    const guide = await this.guideRepository.markAsPrinted(id, printedBy);
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    return guide;
  }

  async markAsShipped(id: string, shippedBy: string) {
    const guide = await this.guideRepository.markAsShipped(id, shippedBy);
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }

    await this.guideRepository.addTrackingEvent(id, {
      status: GuideStatus.PICKED_UP,
      location: guide.origin?.city || 'N/A',
      description: 'Paquete recolectado y enviado',
    });

    return guide;
  }

  async addTrackingEvent(id: string, event: any) {
    const guide = await this.guideRepository.addTrackingEvent(id, event);
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    return guide;
  }

  async updateWarehouseNotes(id: string, notes: string) {
    const guide = await this.guideRepository.updateById(id, { warehouseNotes: notes });
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    return guide;
  }
}
