import { SHIPPING_CARRIER } from '@modules/carriers/domain/carrier.interface';
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IShippingCarrier } from '@modules/carriers/domain/carrier.interface';

@Injectable()
export class ShippingCarrierFactory {
  constructor(
    @Inject(SHIPPING_CARRIER)
    private readonly carriers: IShippingCarrier[],
  ) {}

  /**
   * Obtiene un carrier específico por su clave
   * @param carrierKey - ID del carrier (ej: 'paqueteexpress')
   * @returns La implementación del carrier
   * @throws NotFoundException si el carrier no existe
   */
  public getCarrier(carrierKey: string): IShippingCarrier {
    const carrier = this.carriers.find((c) => c.strategyKey === carrierKey);
    if (!carrier) {
      throw new NotFoundException(
        `El transportista '${carrierKey}' no es soportado.`,
      );
    }
    return carrier;
  }

  /**
   * Obtiene todos los carriers disponibles
   * @returns Array de todos los carriers registrados
   */
  public getAllCarriers(): IShippingCarrier[] {
    return this.carriers;
  }

  /**
   * Verifica si un carrier está disponible
   * @param carrierKey - ID del carrier
   * @returns true si el carrier existe, false en caso contrario
   */
  public hasCarrier(carrierKey: string): boolean {
    return this.carriers.some((c) => c.strategyKey === carrierKey);
  }
}
