import mongoose from 'mongoose';

const trafficRuleSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: {
        values: ['CENTRAL', 'STATE', 'CITY'],
        message: 'Scope must be CENTRAL, STATE, or CITY'
      },
      default: 'CENTRAL',
      required: [true, 'Scope is required']
    },
    state: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function (v) {
          if (this.scope === 'STATE' || this.scope === 'CITY') {
            return typeof v === 'string' && v.trim().length > 0;
          }
          return true;
        },
        message: 'State is required when scope is STATE or CITY'
      }
    },
    city: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function (v) {
          if (this.scope === 'CITY') {
            return typeof v === 'string' && v.trim().length > 0;
          }
          return true;
        },
        message: 'City is required when scope is CITY'
      }
    },
    ruleCode: {
      type: String,
      required: [true, 'Rule code is required'],
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    applicableVehicleTypes: {
      type: [String],
      default: ['All']
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      trim: true,
      default: 'All'
    },
    violation: {
      type: String,
      trim: true,
      default: ''
    },
    fineAmount: {
      type: Number,
      min: [0, 'Fine amount must not be negative'],
      default: null
    },
    additionalPenalty: {
      type: String,
      trim: true,
      default: ''
    },
    legalSection: {
      type: String,
      required: [true, 'Legal section is required'],
      trim: true
    },
    sourceName: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true
    },
    sourceUrl: {
      type: String,
      required: [true, 'Source URL is required'],
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return false;
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: (props) => `${props.value} is not a valid URL`
      }
    },
    governmentDocument: {
      type: String,
      trim: true,
      default: ''
    },
    effectiveFrom: {
      type: Date,
      default: null
    },
    lastVerifiedAt: {
      type: Date,
      required: [true, 'Last verified date is required'],
      default: Date.now
    },
    lastUpdated: {
      type: Date,
      required: [true, 'Last updated date is required'],
      default: Date.now
    },
    status: {
      type: String,
      enum: {
        values: ['VERIFIED', 'REQUIRES_VERIFICATION', 'DEPRECATED'],
        message: 'Status must be VERIFIED, REQUIRES_VERIFICATION, or DEPRECATED'
      },
      default: 'VERIFIED',
      required: true
    },
    language: {
      type: String,
      default: 'en',
      trim: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Pre-validate hook to populate scope and auto-defaults
trafficRuleSchema.pre('validate', function (next) {
  if (this.city && typeof this.city === 'string' && this.city.trim().length > 0) {
    this.scope = 'CITY';
  } else if (this.state && typeof this.state === 'string' && this.state.trim().length > 0) {
    this.scope = 'STATE';
    this.city = null;
  } else {
    this.scope = 'CENTRAL';
    this.state = null;
    this.city = null;
  }

  if (!this.applicableVehicleTypes || this.applicableVehicleTypes.length === 0) {
    this.applicableVehicleTypes = this.vehicleType ? [this.vehicleType] : ['All'];
  }
  if (!this.vehicleType && this.applicableVehicleTypes && this.applicableVehicleTypes.length > 0) {
    this.vehicleType = this.applicableVehicleTypes[0];
  }
  if (!this.ruleCode) {
    const scopePrefix = this.scope === 'CITY' && this.city
      ? this.city.toUpperCase().slice(0, 3)
      : (this.scope === 'STATE' && this.state ? this.state.toUpperCase().slice(0, 3) : 'MVA');
    const catCode = this.category ? this.category.toUpperCase().slice(0, 4) : 'RULE';
    this.ruleCode = `${scopePrefix}-${catCode}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  if (!this.legalSection) {
    this.legalSection = 'Motor Vehicles Act, 1988';
  }
  if (!this.sourceName) {
    this.sourceName = 'Official Government Transport Department';
  }
  if (!this.lastVerifiedAt) {
    this.lastVerifiedAt = this.lastUpdated || new Date();
  }
  if (!this.lastUpdated) {
    this.lastUpdated = this.lastVerifiedAt || new Date();
  }
  next();
});

// Indexes for optimal querying
trafficRuleSchema.index({ scope: 1, state: 1, city: 1, category: 1 });
trafficRuleSchema.index({ state: 1, city: 1, category: 1 });
trafficRuleSchema.index({
  title: 'text',
  description: 'text',
  violation: 'text',
  legalSection: 'text',
  ruleCode: 'text'
});

const TrafficRule =
  mongoose.models.TrafficRule || mongoose.model('TrafficRule', trafficRuleSchema);

export default TrafficRule;
