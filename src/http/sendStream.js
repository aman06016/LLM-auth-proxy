export async function sendStream(res, status, headers, bodyStream) {
  const responseHeaders = {
    "content-type": headers?.get?.("content-type") || "text/event-stream; charset=utf-8",
    "cache-control": headers?.get?.("cache-control") || "no-cache",
    "connection": headers?.get?.("connection") || "keep-alive"
  };

  res.writeHead(status, responseHeaders);

  await new Promise((resolve, reject) => {
    bodyStream.on("error", reject);
    res.on("error", reject);
    res.on("finish", resolve);
    bodyStream.pipe(res);
  });
}
