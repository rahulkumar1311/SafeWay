import mongoose from 'mongoose';

/**
 * Temporary Design Decision:
 * User authentication and User model are not implemented yet.
 * userId is stored as an optional generic String identifier without a Mongoose ref ('User').
 * When user architecture is finalized, this will be updated to ref: 'User'.
 */

const safetyRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: false,
      default: null,
      trim: true,
      index: true
    },
    drowsinessScore: {
      type: Number,
      required: [true, 'Drowsiness score is required'],
      min: [0, 'Drowsiness score must be between 0 and 100'],
      max: [100, 'Drowsiness score must be between 0 and 100']
    },
    drivingScore: {
      type: Number,
      required: [true, 'Driving score is required'],
      min: [0, 'Driving score must be between 0 and 100'],
      max: [100, 'Driving score must be between 0 and 100']
    },
    riskLevel: {
      type: String,
      required: [true, 'Risk level is required'],
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: '{VALUE} is not a valid risk level'
      }
    },
    events: {
      type: Array,
      default: []
    },
    recordedAt: {
      type: Date,
      required: [true, 'Recorded at date is required'],
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying user records chronologically
safetyRecordSchema.index({ userId: 1, recordedAt: -1 });

const SafetyRecord =
  mongoose.models.SafetyRecord ||
  mongoose.model('SafetyRecord', safetyRecordSchema);

export default SafetyRecord;
