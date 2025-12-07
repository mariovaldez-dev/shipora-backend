import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { IOrganizationMemberRepository } from '../../../domain/repositories/organization-member.repository.interface';
import {
  OrganizationMember,
  type MemberRole,
  type MemberStatus,
  type IMemberPermissions,
} from '../../../domain/entities/organization-member.entity';

interface OrganizationMemberDocument {
  _id: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  permissions: IMemberPermissions;
  status: MemberStatus;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrganizationMemberRepository
  implements IOrganizationMemberRepository
{
  constructor(
    @InjectModel('OrganizationMember')
    private readonly model: Model<OrganizationMemberDocument>,
  ) {}

  async findById(id: string): Promise<OrganizationMember | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<OrganizationMember[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationMember[]> {
    const docs = await this.model.find({ organizationId }).lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByUserId(userId: string): Promise<OrganizationMember[]> {
    const docs = await this.model.find({ userId }).lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    const doc = await this.model
      .findOne({ organizationId, userId })
      .lean()
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findActiveByUserId(userId: string): Promise<OrganizationMember[]> {
    const docs = await this.model
      .find({ userId, status: 'active' })
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(entity: OrganizationMember): Promise<OrganizationMember> {
    const doc = await this.model.create({
      _id: entity.id,
      organizationId: entity.organizationId,
      userId: entity.userId,
      role: entity.role,
      permissions: entity.permissions,
      status: entity.status,
      invitedBy: entity.invitedBy,
      invitedAt: entity.invitedAt,
      joinedAt: entity.joinedAt,
      lastActiveAt: entity.lastActiveAt,
    });
    return this.toDomain(doc.toObject());
  }

  async update(
    id: string,
    entity: Partial<OrganizationMember>,
  ): Promise<OrganizationMember> {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: entity }, { new: true })
      .lean()
      .exec();
    return this.toDomain(doc!);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  private toDomain(doc: OrganizationMemberDocument): OrganizationMember {
    return new OrganizationMember({
      id: doc._id,
      organizationId: doc.organizationId,
      userId: doc.userId,
      role: doc.role,
      permissions: doc.permissions,
      status: doc.status,
      invitedBy: doc.invitedBy,
      invitedAt: doc.invitedAt,
      joinedAt: doc.joinedAt,
      lastActiveAt: doc.lastActiveAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
