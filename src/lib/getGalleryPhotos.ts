import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

const galleryPath = path.join(process.cwd(), 'public', 'images', 'gallery');

export interface Photo {
    src: string;          // URL for <img>
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
    // Only include JPEG/PNG since all HEIC are converted
    const files = fs.readdirSync(galleryPath).filter(file =>
        /\.(jpe?g|png)$/i.test(file)
    );

    const photos: Photo[] = await Promise.all(
        files.map(async (file) => {
            const filePath = path.join(galleryPath, file);
            let exifData: any = {};

            try {
                // Parse EXIF directly from JPEG/PNG
                exifData = await exifr.parse(filePath);
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