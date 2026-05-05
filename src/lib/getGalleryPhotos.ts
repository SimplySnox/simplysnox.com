import fs from 'fs';
import path from 'path';
import exifr from 'exifr';
import sharp from 'sharp';

const galleryPath = path.join(process.cwd(), 'public', 'images', 'gallery');
const outputPath = galleryPath; // Keep JPEGs in the same folder (can separate if you want)

export interface Photo {
    src: string;          // URL for <img> (JPEG for browser compatibility)
    title: string;        // Filename or date from EXIF
    exif?: {
        iso: number | null;
        fNumber: number | null;
        exposureTime: string | null;
        focalLength: number | null;
        camera: string | null;
        dateTaken: string | null;
    };
}

export async function getGalleryPhotos(): Promise<Photo[]> {
    const files = fs.readdirSync(galleryPath).filter(file =>
        /\.(jpe?g|png|heic)$/i.test(file)
    );

    const photos: Photo[] = await Promise.all(
        files.map(async (file) => {
            const filePath = path.join(galleryPath, file);
            let exifData: any = {};
            let displaySrc = `/images/gallery/${file}`; // Default URL

            try {
                if (/\.heic$/i.test(file)) {
                    // Convert HEIC to JPEG in memory for EXIF parsing
                    const jpegBuffer = await sharp(filePath).jpeg({ quality: 90 }).toBuffer();

                    // Parse EXIF from the JPEG buffer
                    exifData = await exifr.parse(jpegBuffer);

                    // Write a JPEG copy for browser display
                    const jpegFileName = file.replace(/\.heic$/i, '.jpg');
                    const jpegFilePath = path.join(outputPath, jpegFileName);

                    // Only write if it doesn't already exist
                    if (!fs.existsSync(jpegFilePath)) {
                        fs.writeFileSync(jpegFilePath, jpegBuffer);
                    }

                    displaySrc = `/images/gallery/${jpegFileName}`;
                } else {
                    // JPEG/PNG can be parsed directly
                    exifData = await exifr.parse(filePath);
                }
            } catch (e) {
                console.warn(`Failed to parse EXIF for ${file}`, e);
            }

            const title = exifData?.DateTimeOriginal
                ? `${new Date(exifData.DateTimeOriginal).toLocaleDateString()} — ${file}`
                : file;

            return {
                src: displaySrc,
                title,
                exif: {
                    iso: exifData?.ISO ?? null,
                    fNumber: exifData?.FNumber ?? null,
                    exposureTime: exifData?.ExposureTime?.toString() ?? null,
                    focalLength: exifData?.FocalLength ?? null,
                    camera: exifData?.Model ?? null,
                    dateTaken: exifData?.DateTimeOriginal
                        ? new Date(exifData.DateTimeOriginal).toLocaleString()
                        : null,
                },
            };
        })
    );

    return photos;
}