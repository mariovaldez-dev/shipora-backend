import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

@Schema({ timestamps: true })
export class RoleDocument extends Document {
  @Prop({ type: SchemaTypes.String })
  declare id: string; // opcional, mongoose usa _id, luego lo mapeas

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export const RoleSchema = SchemaFactory.createForClass(RoleDocument);
