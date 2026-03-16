---
title: Understanding Discord Presence
date: March 16, 2026
lastUpdated: 16/03/26 18:20
author: Snox
description: A quick look at how Discord presence works and why it can be useful for developers.
tags: ["discord", "api", "presence"]
---

If you've ever used Discord, you've probably noticed the small colored dot next to someone's profile picture. This is called **presence**, and it shows a user's current status on Discord.

For most users, it's just a way to tell if someone is online. For developers, however, presence data can be **extremely useful**.

---

## Discord Status Types

Discord currently has four main presence states:

| Status | Meaning |
|------|------|
| Online | The user is active on Discord |
| Idle | The user is away or inactive |
| Do Not Disturb | Notifications are muted |
| Offline | The user is not connected |

These statuses are typically represented with colored indicators:

- 🟢 **Online**
- 🌙 **Idle**
- ⛔ **Do Not Disturb**
- ⚫ **Offline**

---

## Why Presence Data Is Useful

Presence becomes interesting when you start building tools around Discord.

For example, developers often use presence data to:

- Show **live Discord status** on a personal website
- Display **currently playing games**
- Show **Spotify listening activity**
- Build **custom dashboards or bots**

A popular API that provides this data is **Lanyard**, which makes Discord presence accessible through a simple API and WebSocket connection.

```js
fetch("https://api.lanyard.rest/v1/users/USER_ID")
  .then(res => res.json())
  .then(data => {
    console.log(data.data.discord_status);
  });