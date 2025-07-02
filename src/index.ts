import type { TraceItem, Env, LokiStream, LogsByLevel } from "./types";

function toLogNanoSeconds(timestamp: number) {
	return (timestamp * 1000000).toLocaleString("fullwide", {
		useGrouping: false,
	});
}

export default {
	async tail(events: TraceItem[], env: Env) {
		const data = this.transformEvents(events);
		if (data.streams.length == 0) {
			return;
		}

		await fetch(env.LOKI_PUSH_URL, {
			method: "POST",
			headers: {
				...(env.LOKI_CREDENTIALS
					? { authorization: `Basic ${env.LOKI_CREDENTIALS}` }
					: {}),
				"content-type": "application/json",
			},
			body: JSON.stringify(data),
		});
	},

	transformEvents(events: TraceItem[]) {
		const streams: LokiStream[] = [];
		for (const event of events) {
			this.transformEvent(event).forEach((stream) => streams.push(stream));
		}

		return { streams };
	},

	transformEvent(event: TraceItem) {
		if (
			!(event.outcome == "ok" || event.outcome == "exception") ||
			!event.scriptName
		) {
			return [];
		}

		const streams: LokiStream[] = [];

		const logsByLevel: LogsByLevel = {};
		for (const log of event.logs) {
			if (!(log.level in logsByLevel)) {
				logsByLevel[log.level] = [];
			}

			const logMessage = log.message.join(" ").trim();
			if (logMessage) {
				logsByLevel[log.level].push([
					toLogNanoSeconds(log.timestamp),
					logMessage,
				]);
			}
		}

		for (const [level, logs] of Object.entries(logsByLevel)) {
			if (level == "debug") {
				continue;
			}

			streams.push({
				stream: {
					level,
					outcome: event.outcome,
					app: event.scriptName,
				},
				values: logs,
			});
		}

		if (event.exceptions.length) {
			streams.push({
				stream: {
					level: "error",
					outcome: event.outcome,
					app: event.scriptName,
				},
				values: event.exceptions.map((e) => [
					toLogNanoSeconds(e.timestamp),
					`${e.name}: ${e.message}`,
				]),
			});
		}

		return streams;
	},
};
