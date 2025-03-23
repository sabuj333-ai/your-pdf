const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true,
        default: 'application/pdf'
    },
    pageCount: {
        type: Number,
        required: true
    },
    isProcessed: {
        type: Boolean,
        default: false
    },
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    processingError: String,
    metadata: {
        title: String,
        author: String,
        subject: String,
        keywords: String,
        creationDate: Date,
        modificationDate: Date
    },
    tags: [{
        type: String,
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }
});

// Indexes for better query performance
pdfSchema.index({ user: 1, createdAt: -1 });
pdfSchema.index({ processingStatus: 1 });
pdfSchema.index({ expiresAt: 1 });

// Virtual for file size in MB
pdfSchema.virtual('sizeInMB').get(function() {
    return (this.size / (1024 * 1024)).toFixed(2);
});

// Method to check if file is expired
pdfSchema.methods.isExpired = function() {
    return Date.now() > this.expiresAt;
};

// Method to update processing status
pdfSchema.methods.updateProcessingStatus = async function(status, error = null) {
    this.processingStatus = status;
    if (error) {
        this.processingError = error;
    }
    if (status === 'completed') {
        this.isProcessed = true;
    }
    await this.save();
};

// Static method to get user's storage usage
pdfSchema.statics.getUserStorageUsage = async function(userId) {
    const result = await this.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: '$size' } } }
    ]);
    return result[0]?.total || 0;
};

// Static method to cleanup expired files
pdfSchema.statics.cleanupExpiredFiles = async function() {
    const expiredFiles = await this.find({
        expiresAt: { $lt: new Date() }
    });
    
    for (const file of expiredFiles) {
        // Delete file from storage (implement storage service)
        // await storageService.deleteFile(file.filePath);
        await file.remove();
    }
};

module.exports = mongoose.model('PDF', pdfSchema); 