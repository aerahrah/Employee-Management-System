const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true },

    // login fields
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // role-based access
    role: {
      type: String,
      enum: ["employee", "supervisor", "hr", "admin"],
      default: "employee",
    },

    // personal & job details
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true },
    phone: { type: String },
    position: { type: String, required: true },
    department: { type: String },
    dateHired: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Resigned", "Terminated"],
      default: "Active",
    },

    // leave balances
    balances: {
      vlHours: { type: Number, default: 0 },
      slHours: { type: Number, default: 0 },
      ctoHours: { type: Number, default: 0 },
    },

    // address & emergency contact
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      province: { type: String, trim: true },
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String },
      relation: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

employeeSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Employee", employeeSchema);
