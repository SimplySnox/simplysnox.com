---
title: Creating your first Discord.js bot
date: March 16, 2026
lastUpdated: "03/16/26 04:48"
author: Snox
description: A quick guide to creating a very simple Discord bot using the latest version of Discord.js.
tags: ["discord", "discordjs", "javascript", "bots"]
---

Creating a Discord bot might sound complicated at first, but a **very simple bot** can actually be built in just a few minutes.

In this post we'll create a small bot using **Discord.js** that logs in and responds to a basic command.

No frameworks. No complicated architecture. Just the basics.

---

## 1. Create a Discord application

First, go to the **[Discord Developer Portal](https://discord.com/developers/applications)**.

Create a new application, then:

1. Go to **Bot**
2. Click **Add Bot**
3. Copy your **bot token** (you'll need this later)

⚠️ **Never share your bot token.** It is essentially the password for your bot.

---

## 2. Create a new Node.js project

Create a new folder for your bot and initialize a project.

```bash
mkdir my-discord-bot
cd my-discord-bot
npm init -y
```

Now install **Discord.js**:

```bash
npm install discord.js
```

This installs the latest version of Discord.js.

---

## 3. Create the bot file

Create a file called:

```plaintext
index.js
```

This file will contain the code for our bot.

Your folder should now look like this:

```plaintext
my-discord-bot/
│
├── index.js
├── package.json
└── node_modules/
```

---

## 4. Write the bot code

Open `index.js` and paste the following code.

```js
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* Changed from "ready" to "clientReady" in DJS v14 */
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('Pong! 🏓');
  }
});

client.login('YOUR_BOT_TOKEN');
```

Replace: `YOUR_BOT_TOKEN` with the bot token you copied earlier.

---

## 5. Invite the bot to your server

Go back to the **[Discord Developer Portal](https://discord.com/developers/applications)**.

Navigate to:

```plaintext
OAuth2 → URL Generator
```

Select the following scopes:

```plaintext
- bot
- applications.commands
```

Then give the bot these permissions:

```plaintext
- Send Messages
- Read Message History
```

Discord will generate an invite link for you.

Open that link in your browser and invite the bot to your server.

---

## 6. Run the bot

Start the bot with:

```bash
node index.js
```

If everything worked correctly, your terminal should show something like:

```plaintext
Logged in as MyBot#1234
```

Now go into your Discord server and type:

```plaintext
!ping
```

Your bot should respond with:

```plaintext
Pong! 🏓
```

And just like that — your first bot is running.

---

## How the code works

Let's break down the important parts.

### Creating the client

```js
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
```

This creates the Discord client and tells Discord what **events the bot should receive**.

Without the correct intents, the bot won't receive message events.

---

### The ready event

```js
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
});
```

This runs when the bot successfully logs into Discord.

---

### Listening for messages

```js
client.on('messageCreate', message => {})
```

This event runs every time a new message is sent in a server the bot can see.

---

### Ignoring bots

```js
if (message.author.bot) return;
```

This prevents bot loops where bots reply to other bots forever.

---

### The command

```js
if (message.content === '!ping') {
  message.reply('Pong! 🏓');
}
```

If someone sends `!ping`, the bot replies with `Pong!`.

---

## What to build next

Once your first bot works, you can start adding features like:

- slash commands
- moderation tools
- welcome messages
- logging systems
- leveling systems
- custom commands

Most bots start small and slowly grow as you experiment.

---

> [!TIP]
> The best way to learn Discord.js is to build small features one at a time. Even experienced developers started with simple bots like this.

---

## Final thoughts

Building your first Discord bot is a great introduction to working with APIs, events, and JavaScript applications.

The hardest part is usually just **starting**.

Once the bot logs in and sends its first message, everything else becomes much easier to understand.

If you're curious about bot development, try adding new commands and experimenting with Discord.js features. You might be surprised how powerful these bots can become.