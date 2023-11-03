const express = require("express");
const path = require("path");
const fs = require("fs");
const ytdl = require("ytdl-core");
const os = require("os");
const Utils = require("./src/utils");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

const dataPath = path.join(os.tmpdir(), "data");

Utils.createDir(dataPath);

app.use("/data", express.static(dataPath));
app.use(express.static(__dirname + "/public"));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

app.get("/download", async (req, res) => {
    // Extract the YouTube URL from the 'url' query parameter
    const youtubeUrl = req.query.url;

    // Check if the 'url' parameter is provided
    if (!youtubeUrl) {
        return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    const sessionID = Date.now(); // Generate a unique session ID
    const sessionDir = path.join(dataPath, sessionID);
    const fullSessionDirPath = path.join(dataPath, sessionID);

    Utils.createDir(sessionDir);

    setTimeout(() => {
        fs.rmSync(sessionDir, { recursive: true });
    }, 180 * 1000);

    try {
        const info = await Utils.getInfo(youtubeUrl);

        info.endpointSongPath = path.join(sessionDir, info.filename);
        info.songPath = path.join(fullSessionDirPath, info.filename);
        info.fullSessionDirPath = fullSessionDirPath;

        await Utils.downloadSong(info, res);
    } catch (error) {
        return res.status(500).json({ error: "Failed to download the audio" });
    }
});

app.get("/getInfo", async (req, res) => {
    const info = await Utils.getInfo(req.query.url);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(info);
});

app.get("/clearBucket", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    if (req.headers.clear_bucket_password !== process.env.CLEAR_BUCKET_PASSWORD) {
        res.json({ error: `Wrong password: ${req.headers.clear_bucket_password}` });
        return;
    }

    const keys = await Utils.clearBucket();
    console.log('Deleted files:', keys);

    res.json({ 'Deleted files': keys });
});

app.get("/bucketItem", async (req, res) => {
    const urls = await Utils.getSignedUrlForDownload(req.query.itemBucketPath);
    console.log(urls);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ url: urls }); // Fixed typo, changed from 'signedUrl' to 'urls'
});

app.get("/getStats", async (req, res) => {
    const stats = await Utils.getStats();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(stats);
});

app.get("/updateVisitStats", async (req, res) => {
    const stats = await Utils.updateVisitStats();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(stats);
});
