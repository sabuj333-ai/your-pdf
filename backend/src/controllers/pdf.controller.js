const PDF = require('../models/pdf.model');
const PDFService = require('../services/pdf.service');
const multer = require('multer');
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
const { PDFProcessingError, FileUploadError } = require('../utils/errors');
const path = require('path');
const fs = require('fs').promises;

class PDFController {
    // Upload a single PDF file
    async uploadPDF(req, res) {
        try {
            if (!req.file) {
                throw new FileUploadError('No file uploaded');
            }

            const pdf = new PDF({
                user: req.user._id,
                originalName: req.file.originalname,
                fileName: req.file.filename,
                filePath: req.file.path,
                size: req.file.size,
                mimeType: req.file.mimetype,
                pageCount: req.file.pageCount
            });

            await pdf.save();

            res.status(201).json({
                success: true,
                data: pdf
            });
        } catch (error) {
            // Delete uploaded file if there's an error
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            throw error;
        }
    }

    // Merge multiple PDFs
    async mergePDFs(req, res) {
        try {
            if (!req.files || req.files.length < 2) {
                throw new FileUploadError('At least 2 PDF files are required');
            }

            const mergedPdfBytes = await PDFService.mergePDFs(req.files);
            
            // Save merged PDF
            const mergedPdf = new PDF({
                user: req.user._id,
                originalName: 'merged.pdf',
                fileName: `merged_${Date.now()}.pdf`,
                filePath: path.join('uploads', `merged_${Date.now()}.pdf`),
                size: mergedPdfBytes.length,
                mimeType: 'application/pdf',
                isProcessed: true
            });

            await fs.writeFile(mergedPdf.filePath, mergedPdfBytes);
            await mergedPdf.save();

            res.status(200).json({
                success: true,
                data: mergedPdf
            });
        } catch (error) {
            throw error;
        }
    }

    // Split PDF into individual pages
    async splitPDF(req, res) {
        try {
            if (!req.file) {
                throw new FileUploadError('No file uploaded');
            }

            const { pages } = req.body;
            if (!pages || !Array.isArray(pages) || pages.length === 0) {
                throw new ValidationError('Please specify pages to split');
            }

            const splitPdfs = await PDFService.splitPDF(req.file, pages);
            const results = [];

            for (let i = 0; i < splitPdfs.length; i++) {
                const pdf = new PDF({
                    user: req.user._id,
                    originalName: `page_${pages[i]}.pdf`,
                    fileName: `split_${Date.now()}_${i}.pdf`,
                    filePath: path.join('uploads', `split_${Date.now()}_${i}.pdf`),
                    size: splitPdfs[i].length,
                    mimeType: 'application/pdf',
                    isProcessed: true
                });

                await fs.writeFile(pdf.filePath, splitPdfs[i]);
                await pdf.save();
                results.push(pdf);
            }

            res.status(200).json({
                success: true,
                data: results
            });
        } catch (error) {
            throw error;
        }
    }

    // Compress PDF
    async compressPDF(req, res) {
        try {
            if (!req.file) {
                throw new FileUploadError('No file uploaded');
            }

            const { imageQuality } = req.body;
            const compressedPdfBytes = await PDFService.compressPDF(req.file, { imageQuality });

            const compressedPdf = new PDF({
                user: req.user._id,
                originalName: 'compressed.pdf',
                fileName: `compressed_${Date.now()}.pdf`,
                filePath: path.join('uploads', `compressed_${Date.now()}.pdf`),
                size: compressedPdfBytes.length,
                mimeType: 'application/pdf',
                isProcessed: true
            });

            await fs.writeFile(compressedPdf.filePath, compressedPdfBytes);
            await compressedPdf.save();

            res.status(200).json({
                success: true,
                data: compressedPdf
            });
        } catch (error) {
            throw error;
        }
    }

    // Add watermark to PDF
    async addWatermark(req, res) {
        try {
            if (!req.file) {
                throw new FileUploadError('No file uploaded');
            }

            const { text, fontSize, angle } = req.body;
            if (!text) {
                throw new ValidationError('Watermark text is required');
            }

            const watermarkedPdfBytes = await PDFService.addWatermark(req.file, text, {
                fontSize,
                angle
            });

            const watermarkedPdf = new PDF({
                user: req.user._id,
                originalName: 'watermarked.pdf',
                fileName: `watermarked_${Date.now()}.pdf`,
                filePath: path.join('uploads', `watermarked_${Date.now()}.pdf`),
                size: watermarkedPdfBytes.length,
                mimeType: 'application/pdf',
                isProcessed: true
            });

            await fs.writeFile(watermarkedPdf.filePath, watermarkedPdfBytes);
            await watermarkedPdf.save();

            res.status(200).json({
                success: true,
                data: watermarkedPdf
            });
        } catch (error) {
            throw error;
        }
    }

    // Rotate PDF pages
    async rotatePDF(req, res) {
        try {
            if (!req.file) {
                throw new FileUploadError('No file uploaded');
            }

            const { pages, angle } = req.body;
            if (!pages || !Array.isArray(pages) || pages.length === 0 || !angle) {
                throw new ValidationError('Please specify pages and rotation angle');
            }

            const rotatedPdfBytes = await PDFService.rotatePDF(req.file, pages, angle);

            const rotatedPdf = new PDF({
                user: req.user._id,
                originalName: 'rotated.pdf',
                fileName: `rotated_${Date.now()}.pdf`,
                filePath: path.join('uploads', `rotated_${Date.now()}.pdf`),
                size: rotatedPdfBytes.length,
                mimeType: 'application/pdf',
                isProcessed: true
            });

            await fs.writeFile(rotatedPdf.filePath, rotatedPdfBytes);
            await rotatedPdf.save();

            res.status(200).json({
                success: true,
                data: rotatedPdf
            });
        } catch (error) {
            throw error;
        }
    }

    // Get user's PDFs
    async getUserPDFs(req, res) {
        try {
            const pdfs = await PDF.find({ user: req.user._id })
                .sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                data: pdfs
            });
        } catch (error) {
            throw error;
        }
    }

    // Delete PDF
    async deletePDF(req, res) {
        try {
            const pdf = await PDF.findOne({
                _id: req.params.id,
                user: req.user._id
            });

            if (!pdf) {
                throw new ValidationError('PDF not found');
            }

            // Delete file from storage
            await fs.unlink(pdf.filePath).catch(console.error);
            
            // Delete from database
            await pdf.remove();

            res.status(200).json({
                success: true,
                message: 'PDF deleted successfully'
            });
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new PDFController(); 