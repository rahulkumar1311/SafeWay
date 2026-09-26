import mongoose from 'mongoose';

/**
 * Temporary Design Decision:
 * User authentication and User model are not implemented yet.
 * userId is stored as a generic String identifier without a Mongoose ref ('User').
 * When user architecture is finalized, this will be updated to ref: 'User'.
 */

const emergencyContactSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const EmergencyContact =
  mongoose.models.EmergencyContact ||
  mongoose.model('EmergencyContact', emergencyContactSchema);

export default EmergencyContact;
