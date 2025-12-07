/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import {
  IShippingCarrier,
  ShipmentRate,
  ShipmentDetails,
  TrackingInfo,
} from '../domain/carrier.interface';
import { PaqueteExpressAdapter } from '../insfrastructure/adapters/paqueteexpress.adapter';
import { PaqueteExpressRateRequest } from '../insfrastructure/models/request/paqueteexpress/paqueteexpress-rate.request.model';
import { PaqueteExpressToRateResponseMapper } from '../insfrastructure/mappers/torate.mapper';
import { GetRatesDto } from '../application/dto/request/get-rates.dto';
import { PaqueteExpressRateRequestMapper } from '../insfrastructure/mappers/paqueteexpress/paqueteexpress-rate.mapper';
import utils from '@modules/core/shared/utils';
import { PaqueteExpressShipmentMapper } from '../insfrastructure/mappers/paqueteexpress/paqueteexpress-shipment.mapper';
import { CreateShipmentRequestDto } from '../application/dto/request/create-shipments.request.dto';
import { PdfQueueService } from '../../documents/jobs/pdf-queue.service';
import { DocumentType } from '../../documents/entities/document-metadata.entity';

@Injectable()
export class PaqueteExpressCarrier implements IShippingCarrier {
  readonly strategyKey = 'paqueteexpress';
  private readonly logger = new Logger(PaqueteExpressCarrier.name);

  constructor(
    private readonly paqueteExpressAdapter: PaqueteExpressAdapter,
    private readonly pdfQueueService: PdfQueueService,
  ) {}

  async getRates(
    shipmentData: GetRatesDto,
    carrierKey: string,
  ): Promise<ShipmentRate[]> {
    const shipmenRates: ShipmentRate[] = [];
    const masterRateId = 'master-rate-pqx-' + utils.getRandomUUIDPart();
    this.logger.log('Obteniendo tarifas de Paquete Express con:', shipmentData);
    this.logger.log('Mapeando DTO a request de Paquete Express');
    try {
      const { products, from, to, userKey } = shipmentData;
      for (const product of products) {
        const paqueteExpressRequest: PaqueteExpressRateRequest =
          PaqueteExpressRateRequestMapper(from, to, product);
        this.logger.log(
          `Llamando a la API de Paquete Express para obtener tarifas ${JSON.stringify(paqueteExpressRequest)}`,
        );
        const rates = await this.paqueteExpressAdapter.fetchRates(
          paqueteExpressRequest,
        );
        this.logger.log(
          'Mapeando respuesta de Paquete Express a modelo de dominio',
        );
        const rate = PaqueteExpressToRateResponseMapper(
          rates,
          product,
          from,
          to,
          masterRateId,
          userKey,
          carrierKey,
        );
        shipmenRates.push(rate);
      }
      this.logger.log(
        `Obtained ${shipmenRates.length} rates from Paquete Express`,
      );
      this.logger.log(`${JSON.stringify(shipmenRates)}`);
      return shipmenRates;
    } catch (error) {
      this.logger.error('Error al obtener tarifas de Paquete Express', error);
      throw new Error('No se pudo obtener las tarifas de Paquete Express.');
    }
  }

  async createShipment(
    shipmentData: CreateShipmentRequestDto,
    shipmentId: string,
  ): Promise<ShipmentDetails[]> {
    const shipmentDetails: ShipmentDetails[] = [];
    this.logger.log('Creando envío en Paquete Express con:', shipmentData);
    const { user, password, client } = utils.getPqExpressGuideCredentials();
    const auth = await this.login(user, password);

    try {
      for (const product of shipmentData.products) {
        const request = PaqueteExpressShipmentMapper(
          user,
          auth,
          client,
          shipmentData.from,
          shipmentData.to,
          product,
        );
        const response: any =
          await this.paqueteExpressAdapter.createShipmentLabel(request);
        this.logger.log(
          'Mapeando respuesta de Paquete Express a modelo de dominio',
        );
        if (!response.body.response.success) {
          throw new Error('No se pudo crear el envío en Paquete Express.');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bodyResp: any = response.body.response;
        const trackingId: string = bodyResp.data;
        const masterId: string = bodyResp.objectDTO.split(':')[1];
        const pdfUrl = `${process.env.PQX_URL_PDF}/wsReportPaquetexpress/GenCartaPorte?trackingNoGen=${trackingId}&measure=`;

        // **Enqueue PDF download/storage job WITHOUT waiting**
        if (pdfUrl) {
          try {
            const filename = `${shipmentId}-${masterId}.pdf`;
            await this.pdfQueueService.enqueuePdfDownload({
              pdfUrl,
              shipmentId: masterId, // Use tracking master ID as shipment ID
              fileName: filename,
              docType: DocumentType.LABEL,
            });
            this.logger.log(
              `PDF download job enqueued for shipment ${filename}`,
            );
          } catch (queueError) {
            // Log error but don't fail the shipment creation
            const msg =
              queueError instanceof Error
                ? queueError.message
                : String(queueError);
            this.logger.error(`Failed to enqueue PDF download: ${msg}`);
          }
        }

        shipmentDetails.push({
          masterTrackingNumber: masterId,
          trackingNumber: trackingId,
          labelUrl: `${process.env.APP_URL}/api/v1/documents/tracking/${trackingId}/download`, // Direct download URL
        });
      }
      return shipmentDetails;
    } catch (error) {
      this.logger.error('Error al crear envío en Paquete Express', error);
      throw new Error('No se pudo crear el envío en Paquete Express.');
    }
  }

  async login(user: string, password: string): Promise<string> {
    this.logger.log('Iniciando sesión en Paquete Express para usuario:', user);
    const response = await this.paqueteExpressAdapter.login({
      header: {
        security: {
          user: user,
          password: password,
        },
      },
    });
    if (!response.body.response.success || !response.body.response.data.token) {
      throw new Error('No se pudo iniciar sesión en Paquete Express.');
    }
    return response.body.response.data.token;
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log('Rastreando en Paquete Express:', trackingNumber);
    // Lógica para llamar a la API de rastreo de Paquete Express.
    return { status: 'Recolectado', history: [] };
  }

  async cancelShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Cancelando en Paquete Express:', trackingNumber);
    // Lógica para llamar a la API de cancelación de Paquete Express.
    return { success: true, message: 'Envío cancelado en Paquete Express.' };
  }
}
