import type {
	AcceptedTraceOutcome,
	Env,
	LokiLogValue,
	LokiStream,
	TraceItem,
} from "./types";

const NANOSECONDS_PER_MILLISECOND = 1_000_000n;

function toLogNanoseconds(timestamp: number): string {
	const normalizedTimestamp = Number.isInteger(timestamp)
		? timestamp
		: Math.trunc(timestamp);

	return (BigInt(normalizedTimestamp) * NANOSECONDS_PER_MILLISECOND).toString();
}

function jsonToString(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "object" && value !== null) {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	return String(value);
}

function isAcceptedTraceOutcome(
	outcome: TraceItem["outcome"],
): outcome is AcceptedTraceOutcome {
	return outcome === "ok" || outcome === "exception";
}

function isNonEmptyScriptName(
	scriptName: TraceItem["scriptName"],
): scriptName is string {
	return typeof scriptName === "string" && scriptName.length > 0;
}

function transformEvent(event: TraceItem): LokiStream[] {
	if (
		!isAcceptedTraceOutcome(event.outcome) ||
		!isNonEmptyScriptName(event.scriptName)
	) {
		return [];
	}

	const streams: LokiStream[] = [];
	const logsByLevel = new Map<string, LokiLogValue[]>();

	for (const log of event.logs) {
		if (log.level === "debug") {
			continue;
		}

		const logMessage = log.message.map(jsonToString).join(" ").trim();
		if (!logMessage) {
			continue;
		}

		const logs = logsByLevel.get(log.level) ?? [];
		logs.push([toLogNanoseconds(log.timestamp), logMessage]);
		logsByLevel.set(log.level, logs);
	}

	for (const [level, logs] of logsByLevel.entries()) {
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
			values: event.exceptions.map((exception) => [
				toLogNanoseconds(exception.timestamp),
				`${exception.name}: ${exception.message}`,
			]),
		});
	}

	return streams;
}

function transformEvents(events: ReadonlyArray<TraceItem>): {
	streams: LokiStream[];
} {
	return { streams: events.flatMap(transformEvent) };
}

const handler: ExportedHandler<Env> = {
	async tail(events, env) {
		if (!env.LOKI_PUSH_URL) {
			console.error("LOKI_PUSH_URL is missing");
			return;
		}

		const data = transformEvents(events);
		if (data.streams.length === 0) {
			return;
		}

		try {
			const response = await fetch(env.LOKI_PUSH_URL, {
				method: "POST",
				headers: {
					...(env.LOKI_CREDENTIALS
						? { authorization: `Basic ${env.LOKI_CREDENTIALS}` }
						: {}),
					"content-type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const responseBody = await response.text();
				console.error(
					`Failed to push logs to Loki: ${response.status} ${response.statusText}`,
					responseBody,
				);
			}
		} catch (error) {
			console.error("Failed to push logs to Loki", error);
		}
	},
};

export default handler;
