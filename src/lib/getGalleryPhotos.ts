import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

const galleryPath = path.join(process.cwd(), 'public', 'images', 'gallery');

export interface Photo {
    src: string;
    title: string;
    exif?: {
        iso: number | null;
        fNumber: string | null;
        exposureTime: string | null;
        focalLength: string | null;
        camera: string | null;
        dateTaken: string | null;
        resolution: string | null;
        mp: string | null;
        fileSizeMB: string | null;
    };
}

// Helper: format EXIF like iPhone Photos
function formatExif(exif: any, filePath: string) {
    if (!exif) return null;

    const width = exif.ExifImageWidth ?? exif.ImageWidth ?? 0;
    const height = exif.ExifImageHeight ?? exif.ImageHeight ?? 0;

    const mp = width && height ? ((width * height) / 1_000_000).toFixed(1) : null;

    // Exposure time formatting
    let exposure = exif.ExposureTime;
    let exposureStr = '';
    if (exposure) {
        if (exposure < 0.01) {
            // Very small → display as 1/x s
            const denominator = Math.round(1 / exposure);
            exposureStr = `1/${denominator} s`;
        } else {
            exposureStr = `${exposure.toFixed(2)} s`;
        }
    }

    // File size
    let fileSizeMB: string | null = null;
    try {
        const stat = fs.statSync(filePath);
        fileSizeMB = (stat.size / (1024 * 1024)).toFixed(1) + ' MB';
    } catch { }

    return {
        iso: exif.ISO ?? null,
        fNumber: exif.FNumber ? `f/${exif.FNumber.toFixed(1)}` : null,
        exposureTime: exposureStr || null,
        focalLength: exif.FocalLength ? `${Math.round(exif.FocalLength)} mm` : null,
        camera: exif.Model ?? null,
        dateTaken: exif.DateTimeOriginal
            ? new Date(exif.DateTimeOriginal).toLocaleString()
            : null,
        resolution: width && height ? `${width}x${height}` : null,
        mp,
        fileSizeMB,
    };
}

export async function getGalleryPhotos(): Promise<Photo[]> {
    // Only JPEG/PNG files
    const files = fs.readdirSync(galleryPath).filter(file =>
        /\.(jpe?g|png)$/i.test(file)
    );

    const photos: Photo[] = await Promise.all(
        files.map(async (file) => {
            const filePath = path.join(galleryPath, file);
            let exifData: any = {};

            try {
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
                exif: formatExif(exifData, filePath),
            };
        })
    );

    return photos;
}