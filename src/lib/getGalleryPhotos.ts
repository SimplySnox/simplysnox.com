import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

const galleryPath = path.join(process.cwd(), 'public', 'images', 'gallery');

export interface Photo {
    src: string;
    title: string;
    dateTaken: string | null;
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

function formatExif(exif: any, fileSizeBytes: number) {
    if (!exif) return null;

    const width = exif.ExifImageWidth ?? exif.ImageWidth ?? 0;
    const height = exif.ExifImageHeight ?? exif.ImageHeight ?? 0;

    const mp = width && height ? ((width * height) / 1_000_000).toFixed(1) : null;
    const resolution = width && height ? `${width}x${height}` : null;

    let exposureTime: string | null = null;

    if (exif.ExposureTime) {
        const exp = exif.ExposureTime;
        exposureTime =
            exp < 0.01
                ? `1/${Math.round(1 / exp)} s`
                : `${exp.toFixed(2)} s`;
    }

    const fNumber = exif.FNumber ? `f/${exif.FNumber.toFixed(1)}` : null;
    const focalLength = exif.FocalLength ? `${Math.round(exif.FocalLength)} mm` : null;

    return {
        iso: exif.ISO ?? null,
        fNumber,
        exposureTime,
        focalLength,
        camera: exif.Model ?? null,
        dateTaken: exif.DateTimeOriginal
            ? new Date(exif.DateTimeOriginal).toISOString()
            : null,
        resolution,
        mp,
        fileSizeMB: (fileSizeBytes / (1024 * 1024)).toFixed(1) + ' MB',
    };
}

export async function getGalleryPhotos(): Promise<Photo[]> {
    const files = fs.readdirSync(galleryPath).filter(f =>
        /\.(jpe?g|png)$/i.test(f)
    );

    const photos = await Promise.all(
        files.map(async (file) => {
            const filePath = path.join(galleryPath, file);

            const [exifData, stats] = await Promise.all([
                exifr.parse(filePath).catch(() => null),
                fs.promises.stat(filePath),
            ]);

            const dateTaken =
                exifData?.DateTimeOriginal
                    ? new Date(exifData.DateTimeOriginal).toISOString()
                    : stats.mtime.toISOString();

            return {
                src: `/images/gallery/${file}`,
                title: file,
                dateTaken,
                exif: formatExif(exifData, stats.size),
            };
        })
    );

    photos.sort(
        (a, b) =>
            new Date(b.dateTaken ?? 0).getTime() -
            new Date(a.dateTaken ?? 0).getTime()
    );

    return photos;
}