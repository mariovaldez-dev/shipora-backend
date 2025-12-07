/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import { PaqueteExpressRateRequest } from '../models/request/paqueteexpress/paqueteexpress-rate.request.model';
import { PaqueteExpressRateResponseModel } from '../models/response/paqueteexpress/paqueteexpress-rate.response.model.ts';
import { PaqueteExpressCreateShipmentRequest } from '../models/request/paqueteexpress/paqueteexpress-create-shipment.request';
import { PaqueteExpressLoginRequest } from '../models/request/paqueteexpress/paqueteexpress-login.request.model';
import { PaqueteExpressLoginResponse } from '../models/response/paqueteexpress/paqueteexpress-login.response.model';

@Injectable()
export class PaqueteExpressAdapter {
  private readonly logger = new Logger(PaqueteExpressAdapter.name);
  private readonly env = function () {
    return {
      PQX_URL: process.env.PQX_URL as string,
      PQX_URL_PDF: process.env.PQX_URL_PDF as string,
    };
  };
  constructor(private readonly httpService: HttpService) {}

  async login(
    params: PaqueteExpressLoginRequest,
  ): Promise<PaqueteExpressLoginResponse> {
    const endpoint = `${this.env().PQX_URL}/RadRestFul/api/rad/loginv1/login`;
    this.logger.log(`Llamando a la API de PaqueteExpress: ${endpoint}`);
    try {
      const response = await firstValueFrom(
        this.httpService.post(endpoint, params, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error en la API de PaqueteExpress',
        error.response?.data,
      );
      throw new Error('No se pudo comunicar con la API de PaqueteExpress.');
    }
  }

  async fetchRates(
    request: PaqueteExpressRateRequest,
  ): Promise<PaqueteExpressRateResponseModel> {
    this.logger.log('Llamando a la API de Paquete Express');
    this.logger.log('Llamando a la PaqueteExpress para cotizar...');
    try {
      const url = `${this.env().PQX_URL}/WsQuotePaquetexpress/api/apiQuoter/v2/getQuotation`;
      this.logger.log(`URL de PaqueteExpress: ${url}`);
      const response = await firstValueFrom(
        this.httpService.post(url, request, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error en la API de PaqueteExpress',
        error.response?.data,
      );
      throw new Error('No se pudo comunicar con la API de PaqueteExpress.');
    }
  }

  async createShipmentLabel(
    request: PaqueteExpressCreateShipmentRequest,
  ): Promise<any> {
    this.logger.log('Llamando a la API de Paquete Express');
    this.logger.log('Llamando a la PaqueteExpress para crear etiqueta...');
    try {
      const url = `${this.env().PQX_URL}/RadRestFul/api/rad/v1/guia`;
      this.logger.log(`URL de PaqueteExpress: ${url}`);
      const response = await firstValueFrom(
        this.httpService.post(url, request, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error en la API de PaqueteExpress',
        error.response?.data,
      );
      throw new Error('No se pudo comunicar con la API de PaqueteExpress.');
    }
  }

  async getPdf(trackingId: string) {
    const endpoint = `${this.env().PQX_URL_PDF}/wsReportPaquetexpress/GenCartaPorte?trackingNoGen=${trackingId}&measure=`;
    try {
      const response = await axios({
        method: 'get',
        url: endpoint,
        responseType: 'stream',
      });

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.data) {
        chunks.push(chunk);
      }

      const pdfBuffer = Buffer.concat(chunks);
      return pdfBuffer.toString('base64');
    } catch (error: any) {
      const err = error as Error;
      this.logger.error('PAQUETE EXPRESS - pqgetPdf', {
        url: endpoint,
        error: err,
      });
      return undefined; // O lanza el error si prefieres que se maneje más arriba
    }
  }
}
