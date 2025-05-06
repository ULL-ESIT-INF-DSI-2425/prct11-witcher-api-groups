import { Document, model, Schema } from 'mongoose';
import validator from 'validator';

export interface HunterDocument extends Document {
  name: string;
  type: string;
  experience: number;
  preferredWeapon?: string;
  coins: number;
  isActive: boolean;
  email?: string;
  monsterSpecialty: string[];
}

const hunterSchema = new Schema<HunterDocument>({
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
  type: {
    type: String,
    required: [true, 'El tipo es obligatorio'],
    enum: {
      values: ['brujo', 'caballero', 'noble', 'bandido', 'mercenario', 'aldeano'],
      message: '{VALUE} no es un tipo de cazador permitido',
    },
  },
  experience: {
    type: Number,
    required: [true, 'La experiencia es obligatoria'],
    min: [0, 'La experiencia no puede ser negativa'],
    max: [100, 'La experiencia máxima es 100'],
  },
  preferredWeapon: {
    type: String,
    trim: true,
    default: '',
  },
  coins: {
    type: Number,
    required: [true, 'Las monedas son obligatorias'],
    min: [0, 'Las monedas no pueden ser negativas'],
    default: 0,
  },
  isActive: {
    type: Boolean,
    required: [true, 'El estado activo es obligatorio'],
    default: true,
  },
  email: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: (v: string) => validator.isEmail(v),
      message: props => `${props.value} no es un email válido`,
    },
  },
  monsterSpecialty: {
    type: [String],
    required: [true, 'La especialidad en monstruos es obligatoria'],
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'Debe tener al menos una especialidad en monstruos',
    },
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const HunterModel = model<HunterDocument>('Hunter', hunterSchema);