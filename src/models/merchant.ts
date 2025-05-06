import { Document, model, Schema } from 'mongoose';
import validator from 'validator';

export interface MerchantDocument extends Document {
  name: string;
  location: string;
  specialty: string;
  isTraveling: boolean;
  inventorySize: number;
  reputation: number;
  contact?: string;
}

const merchantSchema = new Schema<MerchantDocument>({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    validate: {
      validator: (v: string) => validator.isAlphanumeric(v, 'es-ES', { ignore: ' ' }),
      message: props => `El nombre "${props.value}" solo puede contener caracteres alfanuméricos y espacios`,
    },
  },
  location: {
    type: String,
    required: [true, 'La ubicación es obligatoria'],
    trim: true,
  },
  specialty: {
    type: String,
    required: [true, 'La especialidad es obligatoria'],
    enum: {
      values: ['herrero', 'alquimista', 'mercachifle', 'armero', 'sastre'],
      message: '{VALUE} no es una especialidad permitida',
    },
  },
  isTraveling: {
    type: Boolean,
    required: [true, 'El estado de viaje es obligatorio'],
    default: false,
  },
  inventorySize: {
    type: Number,
    required: [true, 'El tamaño del inventario es obligatorio'],
    min: [1, 'El inventario debe tener al menos 1 espacio'],
    max: [100, 'El inventario no puede tener más de 100 espacios'],
  },
  reputation: {
    type: Number,
    required: [true, 'La reputación es obligatoria'],
    min: [0, 'La reputación no puede ser negativa'],
    max: [10, 'La reputación máxima es 10'],
  },
  contact: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: (v: string) => validator.isEmail(v),
      message: props => `${props.value} no es un email válido`,
    },
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const MerchantModel = model<MerchantDocument>('Merchant', merchantSchema);