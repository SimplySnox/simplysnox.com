const bots = [
    {
        id: "1403623185005416499",
        name: "Calcifer",
        avatar: "1e6478c0671dbd6efd36daf3ad42c066",
        key: "calcifer",
        slug: "calcifer",
        public: false,
        invite:
            "https://discord.com/oauth2/authorize?client_id=1403623185005416499&scope=bot%20applications.commands",
        description: "Modern moderation and utility Discord bot for QuietStates.",
        tags: [
            "nodejs",
            "discord",
            "discord-bot",
            "discord-js",
            "moderation",
            "utility"
        ],
    },
    {
        id: "1480121091526496286",
        name: "NexMusic",
        avatar: "e97a74a8466fe7a60e65de38e73bdd4f",
        key: "nexmusic",
        slug: "nexmusic",
        public: true,
        invite:
            "https://discord.com/oauth2/authorize?client_id=1480121091526496286&permissions=3164160&scope=bot%20applications.commands",
        description:
            "Discord music bot powered by Lavalink. Supports YouTube playback, queue management, and more.",
        tags: ["nodejs", "discord", "discord-bot", "discord-js", "music-bot", "lavalink"],
    },
    {
        id: "1488361369932791939",
        name: "Chronix",
        avatar: "f0d76f3ab25563670d1eeb795e448273",
        key: "chronix",
        slug: "chronix",
        public: true,
        invite: "https://discord.com/oauth2/authorize?client_id=1488361369932791939&permissions=137439332417&integration_type=0&scope=bot+applications.commands",
        description: "Create and share Discord timestamps with ease using slash commands. Perfect for reminders, events, and time-based messages.",
        tags: ["discord", "bot", "productivity", "timestamps", "time", "scheduler", "slash-commands", "utility"],
        readme: `
# Chronix Bot

Chronix is a Discord bot designed to make creating **Unix / epoch timestamps** fast and easy. Perfect for reminders, events, or formatting time in messages.

---

## Commands

### \`/timestamp <time>\`
Generate a Discord timestamp for a given time.

- **Example:**  
\`/timestamp 2026-04-01 15:00 UTC\` → <t:1719889200:R>

### \`/now\`
Get the current epoch time instantly.

- **Example:**  
\`/now\` → <t:1719878400:F>

### \`/remind <time> <message>\`
Set a reminder using a Discord timestamp.

- **Example:**  
\`/remind 2026-04-01 15:00 UTC Meeting with team\` → Reminder set!

---

## Screenshots

![Command Example](https://dummyimage.com/600x400/000/faace8.png&text=Command+Example)
![Timestamp Example](https://dummyimage.com/600x400/111/88ffbb.png&text=Timestamp+Example)

---

## Notes

- Uses slash commands for easy interaction.
- Public bot – invite link available above.
- Handles multiple timestamp formats (UTC, relative, etc.).
- Ideal for scheduling, countdowns, or time-based announcements.
`
    },
];

export default bots;