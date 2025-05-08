import { Document, model, Schema } from "mongoose";
import validator from "validator";

/**
 * Interfaz que representa un documento de Cazador en la base de datos.
 * Extiende la interfaz Document de Mongoose para incluir los campos específicos de un Cazador.
 */
export interface HunterDocument extends Document {
  /** Nombre completo del cazador (mínimo 3 caracteres alfanuméricos) */
  name: string;
  /** Tipo/clase de cazador (debe ser uno de los valores permitidos) */
  type: string;
  /** Nivel de experiencia (entre 0 y 100) */
  experience: number;
  /** Arma preferida (opcional) */
  preferredWeapon?: string;
  /** Cantidad de monedas/riqueza (no puede ser negativo) */
  coins: number;
  /** Estado de actividad del cazador */
  isActive: boolean;
  /** Email de contacto (opcional, debe ser válido si se proporciona) */
  email?: string;
  /** Lista de especialidades en tipos de monstruos (mínimo 1 especialidad) */
  monsterSpecialty: string[];
}

/**
 * Esquema de Mongoose que define la estructura, validaciones y configuraciones
 * para los documentos de Cazador en la base de datos.
 */
const hunterSchema = new Schema<HunterDocument>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      validate: {
        validator: (v: string) =>
          validator.isAlphanumeric(v, "es-ES", { ignore: " " }),
        message: (props) =>
          `El nombre "${props.value}" solo puede contener caracteres alfanuméricos y espacios`,
      },
    },
    type: {
      type: String,
      required: [true, "El tipo es obligatorio"],
      enum: {
        values: [
          "brujo",
          "caballero",
          "noble",
          "bandido",
          "mercenario",
          "aldeano",
        ],
        message: "{VALUE} no es un tipo de cazador permitido",
      },
    },
    experience: {
      type: Number,
      required: [true, "La experiencia es obligatoria"],
      min: [0, "La experiencia no puede ser negativa"],
      max: [100, "La experiencia máxima es 100"],
    },
    preferredWeapon: {
      type: String,
      trim: true,
      default: "",
    },
    coins: {
      type: Number,
      required: [true, "Las monedas son obligatorias"],
      min: [0, "Las monedas no pueden ser negativas"],
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: [true, "El estado activo es obligatorio"],
      default: true,
    },
    email: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: (v: string) => validator.isEmail(v),
        message: (props) => `${props.value} no es un email válido`,
      },
    },
    monsterSpecialty: {
      type: [String],
      required: [true, "La especialidad en monstruos es obligatoria"],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "Debe tener al menos una especialidad en monstruos",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/**
 * Modelo de Mongoose para la colección de Cazadores.
 * Proporciona métodos para interactuar con la colección 'hunters' en MongoDB.
 */
export const HunterModel = model<HunterDocument>("Hunter", hunterSchema);
