import { Document, model, Schema } from 'mongoose';
import validator from 'validator';

/**
 * Interfaz que representa un documento de Comerciante en la base de datos.
 * Extiende la interfaz Document de Mongoose para incluir los campos específicos de un Comerciante.
 */
export interface MerchantDocument extends Document {
  /** Nombre completo del comerciante (mínimo 3 caracteres alfanuméricos) */
  name: string;
  /** Ubicación principal del comerciante */
  location: string;
  /** Especialidad comercial (debe ser uno de los valores permitidos) */
  specialty: string;
  /** Indica si el comerciante está actualmente de viaje */
  isTraveling: boolean;
  /** Capacidad del inventario (entre 1 y 100 espacios) */
  inventorySize: number;
  /** Nivel de reputación (escala de 0 a 10) */
  reputation: number;
  /** Información de contacto opcional (email válido si se proporciona) */
  contact?: string;
}

/**
 * Esquema de Mongoose que define la estructura, validaciones y configuraciones
 * para los documentos de Comerciante en la base de datos.
 */
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

/**
 * Modelo de Mongoose para la colección de Comerciantes.
 * Proporciona métodos para interactuar con la colección 'merchants' en MongoDB.
 */
export const MerchantModel = model<MerchantDocument>('Merchant', merchantSchema);