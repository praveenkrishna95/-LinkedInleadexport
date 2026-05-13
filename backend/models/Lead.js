import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Unknown"
    },
    company: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      default: ""
    },
    location: {
      type: String,
      default: ""
    },
    email: {
      type: String,
      default: ""
    },
    linkedinUrl: {
      type: String,
      required: true,
      unique: true,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);

