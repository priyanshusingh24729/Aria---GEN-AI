/**
 * Reads a fetch Response body as a stream of Server-Sent Events frames in
 * the exact format app/utils/streaming.py emits ("event: x\ndata: {...}\n\n")
 * and invokes onEvent for each one as it arrives.
 */
export async function streamSSE(
  response: Response,
  onEvent: (event: string, data: Record<string, unknown>) => void
): Promise<void> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawFrame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      let eventName = "message";
      let dataLine = "";
      for (const line of rawFrame.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLine += line.slice(5).trim();
        }
      }

      if (dataLine) {
        try {
          onEvent(eventName, JSON.parse(dataLine));
        } catch {
          // Malformed frame — skip rather than crash the stream.
        }
      }
    }
  }
}
