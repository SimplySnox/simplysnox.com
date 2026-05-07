import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
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
                <div className="space-y-3">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">
                        gallery
                    </div>

                    <h1 className="text-zinc-100 text-xl md:text-2xl font-medium">
                        Moments away from the screen.
                    </h1>

                    <div className="w-12 border-t border-neutral-800" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {photos.map((photo, index) => {
                        const isPriority = index < 4; // preload first visible batch

                        return (
                            <div
                                key={photo.src}
                                className="group overflow-hidden rounded-2xl border border-neutral-800"
                            >
                                <div className="relative w-full aspect-[4/3] bg-neutral-900 overflow-hidden">
                                    <Image
                                        src={photo.src}
                                        alt={photo.title}
                                        fill
                                        priority={isPriority}
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                    />
                                </div>

                                <div className="px-4 py-3 text-sm text-stone-400 space-y-1">
                                    <div>{new Date(photo.dateTaken).toLocaleDateString()} — {photo.title}</div>

                                    {photo.exif && (
                                        <div className="text-xs text-stone-500 mt-1 space-y-0.5">
                                            {photo.exif.camera && <div>{photo.exif.camera}</div>}

                                            {/* ADDED: date taken from EXIF */}
                                            {/* {photo.exif.dateTaken && (
                                                <div>
                                                    {new Date(photo.exif.dateTaken).toLocaleString()}
                                                </div>
                                            )} */}

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
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Navbar />
            </div>
        </div>
    );
}

export async function getStaticProps() {
    const photos = await getGalleryPhotos();

    return {
        props: { photos },
        revalidate: 60,
    };
}