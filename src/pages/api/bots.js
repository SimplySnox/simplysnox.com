let botCounts = {};

export default async function handler(req, res) {
    if (req.method === "POST") {
        const { key, servers } = req.body;

        if (!key) {
            return res.status(400).json({ error: "Missing bot key" });
        }

        botCounts[key] = servers;

        return res.status(200).json({ success: true });
    }

    if (req.method === "GET") {
        return res.status(200).json(botCounts);
    }

    res.status(405).json({ error: "Method not allowed" });
}