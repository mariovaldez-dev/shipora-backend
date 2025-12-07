/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
export abstract class BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  protected constructor(partial: Partial<BaseEntity>) {
    if (partial.id) this.id = partial.id;
    else if ((partial as any)._id) this.id = (partial as any)._id.toString();
    this.createdAt = partial.createdAt ?? new Date();
    this.updatedAt = partial.updatedAt ?? new Date();
    this.deletedAt = partial.deletedAt ?? undefined;
  }
}
