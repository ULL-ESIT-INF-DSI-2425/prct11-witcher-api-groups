import { Document, model, Schema } from 'mongoose';
import validator from 'validator';

export interface GoodDocument extends Document {
  id: number;
  name: string;
  description?: string;
  material: string;
  weight: number;
  value: number;
}

const goodSchema = new Schema<GoodDocument>({
  id: {
    type: Number,
    required: true,
    unique: true,    
    min: [1, 'El id debe ser positivo'],
  },
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
  description: {
    type: String,
    trim: true,
    default: '',
    maxlength: [200, 'La descripción no puede exceder 200 caracteres'],
  },
  material: {
    type: String,
    required: [true, 'El material es obligatorio'],
    trim: true,
    enum: {
      values: ['madera', 'acero', 'plástico', 'aluminio', 'vidrio'],
      message: '{VALUE} no es un material permitido',
    },
  },
  weight: {
    type: Number,
    required: [true, 'El peso es obligatorio'],
    min: [0, 'El peso no puede ser negativo'],
    validate: {
      validator: (v: number) => v > 0 && v < 1000,
      message: props => `El peso (${props.value}) debe estar entre 0 y 1000`,
    },
  },
  value: {
    type: Number,
    required: [true, 'El valor es obligatorio'],
    min: [0, 'El valor no puede ser negativo'],
    default: 0,
  },
}, {
  timestamps: true,           
  versionKey: false,           
});

export const GoodModel = model<GoodDocument>('Good', goodSchema);