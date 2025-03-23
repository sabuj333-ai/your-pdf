class PDFProcessingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PDFProcessingError';
        this.status = 400;
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400;
    }
}

class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
        this.status = 401;
    }
}

class AuthorizationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthorizationError';
        this.status = 403;
    }
}

class StorageLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageLimitError';
        this.status = 403;
    }
}

class FileUploadError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FileUploadError';
        this.status = 400;
    }
}

module.exports = {
    PDFProcessingError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    StorageLimitError,
    FileUploadError
}; 