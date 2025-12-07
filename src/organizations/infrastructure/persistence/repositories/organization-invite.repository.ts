import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { IOrganizationInviteRepository } from '../../../domain/repositories/organization-invite.repository.interface';
import {
  OrganizationInvite,
  type InviteStatus,
} from '../../../domain/entities/organization-invite.entity';
import type { MemberRole } from '../../../domain/entities/organization-member.entity';

interface OrganizationInviteDocument {
  _id: string;
  organizationId: string;
  email: string;
  role: Exclude<MemberRole, 'owner'>;
  token: string;
  invitedBy: string;
  status: InviteStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrganizationInviteRepository
  implements IOrganizationInviteRepository
{
  constructor(
    @InjectModel('OrganizationInvite')
    private readonly model: Model<OrganizationInviteDocument>,
  ) {}

  async findById(id: string): Promise<OrganizationInvite | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<OrganizationInvite[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByToken(token: string): Promise<OrganizationInvite | null> {
    const doc = await this.model.findOne({ token }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationInvite[]> {
    const docs = await this.model.find({ organizationId }).lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findPendingByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationInvite[]> {
    const docs = await this.model
      .find({ organizationId, status: 'pending' })
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findPendingByEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInvite | null> {
    const doc = await this.model
      .findOne({
        organizationId,
        email: email.toLowerCase(),
        status: 'pending',
      })
      .lean()
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async create(entity: OrganizationInvite): Promise<OrganizationInvite> {
    const doc = await this.model.create({
      _id: entity.id,
      organizationId: entity.organizationId,
      email: entity.email,
      role: entity.role,
      token: entity.token,
      invitedBy: entity.invitedBy,
      status: entity.status,
      expiresAt: entity.expiresAt,
      acceptedAt: entity.acceptedAt,
      acceptedBy: entity.acceptedBy,
    });
    return this.toDomain(doc.toObject());
  }

  async update(
    id: string,
    entity: Partial<OrganizationInvite>,
  ): Promise<OrganizationInvite> {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: entity }, { new: true })
      .lean()
      .exec();
    return this.toDomain(doc!);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  private toDomain(doc: OrganizationInviteDocument): OrganizationInvite {
    return new OrganizationInvite({
      id: doc._id,
      organizationId: doc.organizationId,
      email: doc.email,
      role: doc.role,
      token: doc.token,
      invitedBy: doc.invitedBy,
      status: doc.status,
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt,
      acceptedBy: doc.acceptedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
