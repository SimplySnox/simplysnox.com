import React from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import { getGalleryPhotos, Photo } from '@/lib/getGalleryPhotos';

interface GalleryProps {
    photos: Photo[];
}

export default function Gallery({ photos }: GalleryProps) {
    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased p-4 md:p-8">
            <Head>
                <title>Gallery | Snox</title>
            </Head>

            <div className="max-w-3xl w-full px-3 md:px-0 py-20 md:py-16 space-y-8">
                <div className="space-y-3 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">
                        gallery
                    </div>

                    <h1 className="text-zinc-100 text-xl md:text-2xl font-medium">
                        Moments away from the screen.
                    </h1>

                    <div className="w-12 border-t border-neutral-800" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {photos.map((photo, index) => (
                        <div
                            key={index}
                            className="group overflow-hidden rounded-2xl border border-neutral-800 animate-blurred-fade-in duration-300"
                        >
                            <img
                                src={photo.src}
                                alt={photo.title}
                                className="w-full h-64 md:h-72 object-cover group-hover:scale-[1.02] duration-500"
                            />
                            <div className="px-4 py-3 text-sm text-stone-400 space-y-1">
                                {/* Photo title */}
                                <div>{photo.title}</div>

                                {/* If EXIF exists, show nicely formatted metadata */}
                                {photo.exif && (
                                    <div className="text-xs text-stone-500 mt-1 space-y-0.5">
                                        {photo.exif.camera && <div>{photo.exif.camera}</div>}
                                        <div>
                                            {photo.exif.mp && `${photo.exif.mp} MP`}
                                            {photo.exif.resolution && ` | ${photo.exif.resolution}`}
                                            {photo.exif.fileSizeMB && ` | ${photo.exif.fileSizeMB}`}
                                        </div>
                                        <div>
                                            {photo.exif.iso && `ISO ${photo.exif.iso}`}
                                            {photo.exif.focalLength && ` | ${photo.exif.focalLength}`}
                                            {photo.exif.fNumber && ` | ${photo.exif.fNumber}`}
                                            {photo.exif.exposureTime && ` | ${photo.exif.exposureTime}`}
                                        </div>
                                    </div>
                                )}

                                {/* If EXIF missing dateTaken, show fallback */}
                                {!photo.exif?.dateTaken && photo.dateTaken && (
                                    <div className="text-xs text-stone-500 mt-1">
                                        Taken: {new Date(photo.dateTaken).toLocaleString()} (file fallback)
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <Navbar />
            </div>
        </div>
    );
}

// Pre-render at build time
export async function getStaticProps() {
    const photos = await getGalleryPhotos();
    return { props: { photos } };
}