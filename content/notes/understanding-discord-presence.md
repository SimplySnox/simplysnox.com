---
author: Snox
date: March 08, 2026
description: A quick look at how Discord presence works and why it can
  be useful for developers.
lastUpdated: "03/09/26 18:20"
tags:
- discord
- api
- presence
title: Understanding Discord Presence
---

If you've ever used Discord, you've probably noticed the small colored
dot next to someone's profile picture. This is called **presence**, and
it shows a user's current status on Discord.

For most users, it's just a way to tell if someone is online. For
developers, however, presence data can be **extremely useful**.

------------------------------------------------------------------------

## Discord Status Types

Discord currently has four main presence states:

  | Status | Meaning |
  | ------ | ------- |
  | Online | The user is active on Discord |
  | Idle | The user is away or inactive |
  | Do Not Disturb | Notifications are muted |
  | Offline | The user is not connected |

These statuses are typically represented with colored indicators:

-   🟢 **Online**
-   🌙 **Idle**
-   ⛔ **Do Not Disturb**
-   ⚫ **Offline**

------------------------------------------------------------------------

## Why Presence Data Is Useful

Presence becomes interesting when you start building tools around
Discord.

For example, developers often use presence data to:

-   Show **live Discord status** on a personal website
-   Display **currently playing games**
-   Show **Spotify listening activity**
-   Build **custom dashboards or bots**

A popular API that provides this data is **Lanyard**, which makes
Discord presence accessible through a simple API and WebSocket
connection.

``` js
fetch("https://api.lanyard.rest/v1/users/USER_ID")
  .then(res => res.json())
  .then(data => {
    console.log(data.data.discord_status);
  });
```

The response might look something like:

``` json
{
  "discord_status": "online"
}
```

This allows you to easily show something like:

> **Status:** Online

on your website.

------------------------------------------------------------------------

## Presence Updates in Real Time

While HTTP APIs work well, presence is most useful when it updates
**instantly**.

Many presence APIs support **WebSockets**, which allow your application
to receive updates whenever a user's status changes.

This means you can build things like:

-   Live Discord status widgets
-   Real-time activity trackers
-   Dynamic profile pages

Without needing to constantly poll the API.

------------------------------------------------------------------------

> \[!TIP\] If you're building a personal site, adding your Discord
> presence can make the page feel **more alive**. It gives visitors a
> quick way to see if you're currently online or working on something.

------------------------------------------------------------------------

## A Simple Example

Here's a minimal example of how presence might appear on a website:

```plaintext
SimplySnox
Status: Online
Playing: Visual Studio Code
```

Small details like this can make personal sites feel **much more
dynamic**.

------------------------------------------------------------------------

## Final Thoughts

Discord presence is a small feature that becomes surprisingly powerful
when developers start using it creatively.

Whether you're building a **portfolio**, **dashboard**, or **Discord
bot**, presence data can add a nice touch of real-time interaction to
your projects.

And the best part? It's incredibly easy to integrate.

------------------------------------------------------------------------

If you're curious about how this website shows Discord presence, you can
check the source code on GitHub.
