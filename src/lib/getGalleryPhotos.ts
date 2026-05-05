import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

const galleryPath = path.join(process.cwd(), 'public', 'images', 'gallery');

export interface Photo {
    src: string;
    title: string;
    dateTaken: string | null; // For sorting and fallback
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

// Format EXIF cleanly for gallery
function formatExif(exif: any, filePath: string) {
    if (!exif) return null;

    const width = exif.ExifImageWidth ?? exif.ImageWidth ?? 0;
    const height = exif.ExifImageHeight ?? exif.ImageHeight ?? 0;

    const mp = width && height ? ((width * height) / 1_000_000).toFixed(1) : null;
    const resolution = width && height ? `${width}x${height}` : null;

    // Exposure time
    let exposureTime = '';
    if (exif.ExposureTime) {
        const exp = exif.ExposureTime;
        if (exp < 0.01) {
            exposureTime = `1/${Math.round(1 / exp)} s`;
        } else {
            exposureTime = `${exp.toFixed(2)} s`;
        }
    }

    const fNumber = exif.FNumber ? `f/${exif.FNumber.toFixed(1)}` : null;
    const focalLength = exif.FocalLength ? `${Math.round(exif.FocalLength)} mm` : null;

    let fileSizeMB: string | null = null;
    try {
        const stat = fs.statSync(filePath);
        fileSizeMB = (stat.size / (1024 * 1024)).toFixed(1) + ' MB';
    } catch { }

    return {
        iso: exif.ISO ?? null,
        fNumber,
        exposureTime: exposureTime || null,
        focalLength,
        camera: exif.Model ?? null,
        dateTaken: exif.DateTimeOriginal
            ? new Date(exif.DateTimeOriginal).toLocaleString()
            : null,
        resolution,
        mp,
        fileSizeMB,
    };
}

export async function getGalleryPhotos(): Promise<Photo[]> {
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

            // Determine dateTaken: EXIF first, fallback to file modified time
            let dateTaken: string | null = null;
            if (exifData?.DateTimeOriginal) {
                dateTaken = new Date(exifData.DateTimeOriginal).toISOString();
            } else {
                try {
                    const stats = fs.statSync(filePath);
                    dateTaken = stats.mtime.toISOString();
                } catch { }
            }

            const title = dateTaken
                ? `${new Date(dateTaken).toLocaleDateString()} — ${file}`
                : file;

            return {
                src: `/images/gallery/${file}`,
                title,
                dateTaken, // For sorting and fallback display
                exif: formatExif(exifData, filePath),
            };
        })
    );

    // Sort newest first
    photos.sort((a, b) => {
        const timeA = a.dateTaken ? new Date(a.dateTaken).getTime() : 0;
        const timeB = b.dateTaken ? new Date(b.dateTaken).getTime() : 0;
        return timeB - timeA;
    });

    return photos;
}