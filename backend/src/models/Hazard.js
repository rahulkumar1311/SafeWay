import mongoose from 'mongoose';

const hazardSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Hazard type is required'],
      enum: {
        values: ['pothole', 'accident', 'roadblock', 'waterlogging', 'construction', 'other'],
        message: '{VALUE} is not a valid hazard type'
      },
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    // GeoJSON Point location field for future geospatial queries ($near, $geoWithin)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number] // Format: [longitude, latitude]
      }
    },
    severity: {
      type: String,
      required: [true, 'Severity is required'],
      enum: {
        values: ['low', 'medium', 'high'],
        message: '{VALUE} is not a valid severity level'
      }
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['active', 'resolved'],
        message: '{VALUE} is not a valid status'
      },
      default: 'active',
      index: true
    },
    // Optional generic user identifier (no User model reference yet)
    reportedBy: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to populate GeoJSON location coordinates automatically from longitude & latitude
hazardSchema.pre('save', function (next) {
  if (this.longitude != null && this.latitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  }
  next();
});

// Geospatial 2dsphere index for location proximity queries
hazardSchema.index({ location: '2dsphere' });

const Hazard = mongoose.models.Hazard || mongoose.model('Hazard', hazardSchema);

export default Hazard;
