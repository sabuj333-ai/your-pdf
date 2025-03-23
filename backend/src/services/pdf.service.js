const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { PDFProcessingError } = require('../utils/errors');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

class PDFService {
    // Upload PDF to S3
    async uploadToS3(file, userId) {
        const key = `pdfs/${userId}/${uuidv4()}-${file.originalname}`;
        
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'private'
        };

        const result = await s3.upload(params).promise();
        return {
            key: key,
            url: result.Location
        };
    }

    // Merge multiple PDFs
    async mergePDFs(files) {
        try {
            const mergedPdf = await PDFDocument.create();
            
            for (const file of files) {
                const pdfBytes = await fs.readFile(file.path);
                const pdf = await PDFDocument.load(pdfBytes);
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            const mergedPdfBytes = await mergedPdf.save();
            return mergedPdfBytes;
        } catch (error) {
            throw new PDFProcessingError('Error merging PDFs: ' + error.message);
        }
    }

    // Split PDF into individual pages
    async splitPDF(file, pages) {
        try {
            const pdfBytes = await fs.readFile(file.path);
            const pdf = await PDFDocument.load(pdfBytes);
            const splitPdfs = [];

            for (const pageNum of pages) {
                const newPdf = await PDFDocument.create();
                const [page] = await newPdf.copyPages(pdf, [pageNum - 1]);
                newPdf.addPage(page);
                const pdfBytes = await newPdf.save();
                splitPdfs.push(pdfBytes);
            }

            return splitPdfs;
        } catch (error) {
            throw new PDFProcessingError('Error splitting PDF: ' + error.message);
        }
    }

    // Compress PDF
    async compressPDF(file, options = {}) {
        try {
            const pdfBytes = await fs.readFile(file.path);
            const pdf = await PDFDocument.load(pdfBytes);
            
            // Compress images
            const pages = pdf.getPages();
            for (const page of pages) {
                const { width, height } = page.getSize();
                const images = await page.node.Resources().lookup(PDFDocument.PDFName.of('XObject'));
                
                if (images) {
                    const imageObjects = images.dict ? Object.values(images.dict) : [];
                    for (const image of imageObjects) {
                        if (image instanceof PDFDocument.PDFStream) {
                            const imageData = await image.getImage();
                            if (imageData) {
                                // Compress image using sharp
                                const compressedImage = await sharp(imageData)
                                    .jpeg({ quality: options.imageQuality || 80 })
                                    .toBuffer();
                                await image.setImage(compressedImage);
                            }
                        }
                    }
                }
            }

            const compressedPdfBytes = await pdf.save();
            return compressedPdfBytes;
        } catch (error) {
            throw new PDFProcessingError('Error compressing PDF: ' + error.message);
        }
    }

    // Add watermark to PDF
    async addWatermark(file, watermarkText, options = {}) {
        try {
            const pdfBytes = await fs.readFile(file.path);
            const pdf = await PDFDocument.load(pdfBytes);
            
            const pages = pdf.getPages();
            for (const page of pages) {
                const { width, height } = page.getSize();
                
                // Create watermark text
                page.drawText(watermarkText, {
                    x: width / 2,
                    y: height / 2,
                    size: options.fontSize || 50,
                    color: PDFDocument.rgb(0.5, 0.5, 0.5, 0.3),
                    rotate: options.angle || 45,
                    textAlign: 'center'
                });
            }

            const watermarkedPdfBytes = await pdf.save();
            return watermarkedPdfBytes;
        } catch (error) {
            throw new PDFProcessingError('Error adding watermark: ' + error.message);
        }
    }

    // Rotate PDF pages
    async rotatePDF(file, pages, angle) {
        try {
            const pdfBytes = await fs.readFile(file.path);
            const pdf = await PDFDocument.load(pdfBytes);
            
            for (const pageNum of pages) {
                const page = pdf.getPage(pageNum - 1);
                page.setRotation(PDFDocument.degrees(angle));
            }

            const rotatedPdfBytes = await pdf.save();
            return rotatedPdfBytes;
        } catch (error) {
            throw new PDFProcessingError('Error rotating PDF: ' + error.message);
        }
    }

    // Extract text from PDF (OCR)
    async extractText(file) {
        try {
            // This is a placeholder for OCR functionality
            // You would need to integrate with a service like Tesseract.js or Google Cloud Vision
            throw new Error('OCR functionality not implemented');
        } catch (error) {
            throw new PDFProcessingError('Error extracting text: ' + error.message);
        }
    }

    // Convert PDF to images
    async convertToImages(file, options = {}) {
        try {
            // This is a placeholder for PDF to image conversion
            // You would need to integrate with a service like pdf2image or similar
            throw new Error('PDF to image conversion not implemented');
        } catch (error) {
            throw new PDFProcessingError('Error converting PDF to images: ' + error.message);
        }
    }

    // Delete PDF from S3
    async deleteFromS3(key) {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
        };

        await s3.deleteObject(params).promise();
    }
}

module.exports = new PDFService(); 