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
                source: '/r/discord',
                destination: 'https://discord.gg/RaQwfpCry8',
                permanent: true,
            },
            {
                source: '/r/ttv',
                destination: 'https://twitch.tv/simplysnox',
                permanent: true,
            },
            {
                source: '/r/yt',
                destination: 'https://youtube.com/@simplysnox',
                permanent: true,
            },
        ]
    },
}