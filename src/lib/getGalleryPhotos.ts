import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

const galleryPath = path.join(process.cwd(), 'public', 'gallery');

export interface Photo {
    src: string;
    title: string;
    exif?: {
        iso?: number;
        fNumber?: number;
        exposureTime?: string;
        focalLength?: number;
        camera?: string;
        dateTaken?: string;
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
                exifData = await exifr.parse(filePath);
            } catch (e) {
                console.warn(`Failed to parse EXIF for ${file}`, e);
            }

            const title = exifData?.DateTimeOriginal
                ? `${new Date(exifData.DateTimeOriginal).toLocaleDateString()} — ${file}`
                : file;

            return {
                src: `/gallery/${file}`,
                title,
                exif: {
                    iso: exifData?.ISO,
                    fNumber: exifData?.FNumber,
                    exposureTime: exifData?.ExposureTime?.toString(),
                    focalLength: exifData?.FocalLength,
                    camera: exifData?.Model,
                    dateTaken: exifData?.DateTimeOriginal
                        ? new Date(exifData.DateTimeOriginal).toLocaleString()
                        : undefined,
                },
            };
        })
    );

    return photos;
}