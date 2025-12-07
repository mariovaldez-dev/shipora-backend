import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, required: false, default: null })
  tenantId: string | null;

  @Prop({ type: [String], default: ['user'] })
  roles: string[];

  @Prop({ default: null })
  deletedAt?: Date;
}
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });
