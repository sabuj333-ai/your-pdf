const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth } = require('../middleware/auth.middleware');
const PDFController = require('../controllers/pdf.controller');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Upload single PDF
router.post('/upload', auth, upload.single('file'), PDFController.uploadPDF);

// Merge multiple PDFs
router.post('/merge', auth, upload.array('files', 10), PDFController.mergePDFs);

// Split PDF
router.post('/split', auth, upload.single('file'), PDFController.splitPDF);

// Compress PDF
router.post('/compress', auth, upload.single('file'), PDFController.compressPDF);

// Add watermark to PDF
router.post('/watermark', auth, upload.single('file'), PDFController.addWatermark);

// Rotate PDF
router.post('/rotate', auth, upload.single('file'), PDFController.rotatePDF);

// Get user's PDFs
router.get('/my-pdfs', auth, PDFController.getUserPDFs);

// Delete PDF
router.delete('/:id', auth, PDFController.deletePDF);

module.exports = router; 