import mongoose, { Document, Model, Schema, Types } from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/env";

/**
 * User interface
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  gender: string;
  password: string;
  avatar?: {
    public_id?: string;
    url?: string;
  };
  role: string;
  createdAt: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;

  getJWTToken(): string;
  comparePassword(enteredPassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
}

/**
 * User Schema
 */
const userSchema: Schema<IUser> = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Enter Your Name"],
  },
  email: {
    type: String,
    required: [true, "Please Enter Your Email"],
    unique: true,
    validate: [validator.isEmail, "Please Enter a valid Email"],
  },
  gender: {
    type: String,
    required: [true, "Please Enter Gender"],
  },
  password: {
    type: String,
    required: [true, "Please Enter Your Password"],
    minlength: [8, "Password should have atleast 8 chars"],
    select: false,
  },
  avatar: {
    public_id: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  role: {
    type: String,
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// password is `select: false` so ordinary queries never load it, but
// controllers that need it for comparePassword (login, updatePassword)
// explicitly `.select("+password")`. Strip it - and the reset-token
// fields - on every serialization so it never leaks into a JSON
// response regardless of how the document was queried.
function stripSensitiveFields(_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> {
  delete ret.password;
  delete ret.resetPasswordToken;
  delete ret.resetPasswordExpire;
  return ret;
}
// `as any`: Mongoose's transform type is generated from the full document
// type (password required, non-optional), which TS's `delete` operator
// refuses to target. A Record-based transform is the standard escape
// hatch for this exact mongoose+strict-mode friction point.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userSchema.set("toJSON", { transform: stripSensitiveFields as any });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userSchema.set("toObject", { transform: stripSensitiveFields as any });

/**
 * Encrypt password before saving
 */
userSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});


/**
 * Sign a JWT carrying the user's id and email.
 */
userSchema.methods.getJWTToken = function (): string {
  return jwt.sign({ id: this._id, email: this.email }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  } as jwt.SignOptions);
};

/**
 * Compare password
 */
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Reset password token
 */
userSchema.methods.getResetPasswordToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);

  return resetToken;
};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;