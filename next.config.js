/** @type {import('next').NextConfig} */
module.exports = {
    images: {
        domains: [
            "us-east-1.tixte.net",
            "github.com",
            "avatars.githubusercontent.com",
            "cdn.discordapp.com"
        ],
    },
    async redirects() {
        return [
            {
                source: '/discord/:path*',
                destination: 'https://discord.gg/RaQwfpCry8',
                permanent: false,
            },
            {
                source: '/r/discord/:path*',
                destination: 'https://discord.gg/RaQwfpCry8',
                permanent: false,
            },
            {
                source: '/twitch/:path*',
                destination: 'https://twitch.tv/simplysnox',
                permanent: false,
            },

            {
                source: '/r/twitch/:path*',
                destination: 'https://twitch.tv/simplysnox',
                permanent: false,
            },
            {
                source: '/youtube/:path*',
                destination: 'https://youtube.com/@simplysnox',
                permanent: false,
            },
            {
                source: '/r/youtube/:path*',
                destination: 'https://youtube.com/@simplysnox',
                permanent: false,
            },
        ]
    },
}