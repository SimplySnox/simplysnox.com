export function getDiscordAvatar(id, avatar) {
    if (!avatar) {
        return "https://cdn.discordapp.com/embed/avatars/1.png";
    }

    const ext = avatar.startsWith("a_") ? "gif" : "webp";

    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=128`;
}