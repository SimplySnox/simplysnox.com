import fs from 'fs';
import path from 'path';
import exifr from 'exifr';
import sharp from 'sharp';

const galleryPath = path.join(process.cwd(), 'public', 'images', 'gallery');

export interface Photo {
    src: string;
    title: string;
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
        files.map(async file => {
            const filePath = path.join(galleryPath, file);

            let exifData: any = {};

            try {
                if (/\.heic$/i.test(file)) {
                    // Convert HEIC buffer to JPEG in memory for EXIF parsing
                    const buffer = await sharp(filePath).jpeg().toBuffer();
                    exifData = await exifr.parse(buffer);
                } else {
                    exifData = await exifr.parse(filePath);
                }
            } catch (e) {
                console.warn(`Failed to parse EXIF for ${file}`, e);
            }

            const title = exifData?.DateTimeOriginal
                ? `${new Date(exifData.DateTimeOriginal).toLocaleDateString()} — ${file}`
                : file;

            return {
                src: `/images/gallery/${file}`,
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