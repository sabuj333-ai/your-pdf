const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please provide your full name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    storageUsed: {
        type: Number,
        default: 0
    },
    maxStorage: {
        type: Number,
        default: 100 * 1024 * 1024 // 100MB default
    },
    lastLogin: {
        type: Date
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Get user's PDFs
userSchema.methods.getPDFs = async function() {
    return await mongoose.model('PDF').find({ user: this._id });
};

// Get user's storage usage
userSchema.methods.getStorageUsage = async function() {
    const pdfs = await mongoose.model('PDF').find({ user: this._id });
    return pdfs.reduce((total, pdf) => total + pdf.size, 0);
};

// Method to check storage limit
userSchema.methods.hasStorageAvailable = function(fileSize) {
    return (this.storageUsed + fileSize) <= this.maxStorage;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 