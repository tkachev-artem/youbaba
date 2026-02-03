import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Роли админов
export enum AdminRole {
  ADMIN = 'admin',
  SUPER = 'super',
}

// Интерфейс документа Admin
export interface IAdmin extends Document {
  username: string;
  password: string;
  email?: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Методы
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Схема Admin
const adminSchema = new Schema<IAdmin>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    role: {
      type: String,
      enum: Object.values(AdminRole),
      default: AdminRole.ADMIN,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc: any, ret: any) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Хеширование пароля перед сохранением
adminSchema.pre('save', async function () {
  // Хешируем только если пароль был изменен
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Метод для сравнения паролей
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Индексы
// username уже имеет unique: true, не нужно дублировать
adminSchema.index({ isActive: 1 });

// Экспорт модели
export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);
