import type {
	Env,
	LokiLogValue,
	LokiStream,
	TraceAlarmEvent,
	TraceCronEvent,
	TraceFetchEvent,
	TraceItem,
	TraceSource,
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

function addIfNonEmptyString(
	target: Record<string, unknown>,
	key: string,
	value: unknown,
): void {
	if (isNonEmptyString(value)) {
		target[key] = value;
	}
}

function addIfNumber(
	target: Record<string, unknown>,
	key: string,
	value: unknown,
): void {
	if (typeof value === "number") {
		target[key] = value;
	}
}

function isNonEmptyScriptName(
	scriptName: TraceItem["scriptName"],
): scriptName is string {
	return isNonEmptyString(scriptName);
}

function isTraceFetchEvent(
	event: TraceItem["event"],
): event is TraceFetchEvent {
	if (!isRecord(event) || !("request" in event)) {
		return false;
	}

	const request = event.request;
	if (!isRecord(request)) {
		return false;
	}

	return typeof request.method === "string" && typeof request.url === "string";
}

function isTraceCronEvent(event: TraceItem["event"]): event is TraceCronEvent {
	if (!isRecord(event) || !("cron" in event) || !("scheduledTime" in event)) {
		return false;
	}

	return (
		typeof event.cron === "string" && typeof event.scheduledTime === "number"
	);
}

function isTraceAlarmEvent(
	event: TraceItem["event"],
): event is TraceAlarmEvent {
	return (
		isRecord(event) &&
		"scheduledTime" in event &&
		!isTraceFetchEvent(event) &&
		!isTraceCronEvent(event)
	);
}

function getSource(event: TraceItem): TraceSource {
	if (isTraceFetchEvent(event.event)) {
		return "fetch";
	}

	if (isTraceCronEvent(event.event)) {
		return "cron";
	}

	if (isTraceAlarmEvent(event.event)) {
		return "alarm";
	}

	return "unknown";
}

function createLokiLabels(
	event: TraceItem,
	level: string,
	source: TraceSource,
): LokiStream["stream"] {
	return {
		level,
		outcome: event.outcome,
		app: event.scriptName ?? "unknown",
		source,
		...(typeof event.entrypoint === "string" && event.entrypoint.length > 0
			? { entrypoint: event.entrypoint }
			: {}),
		...(typeof event.executionModel === "string" &&
		event.executionModel.length > 0
			? { executionModel: event.executionModel }
			: {}),
	};
}

function getContextTimestamp(event: TraceItem): number {
	if (typeof event.eventTimestamp === "number") {
		return event.eventTimestamp;
	}

	const firstLog = event.logs[0];
	if (firstLog) {
		return firstLog.timestamp;
	}

	const firstException = event.exceptions[0];
	if (firstException) {
		return firstException.timestamp;
	}

	return Date.now();
}

function createContextMessage(event: TraceItem, source: TraceSource): string {
	const context: Record<string, unknown> = {
		type: source,
		outcome: event.outcome,
	};

	addIfNumber(context, "eventTimestamp", event.eventTimestamp);
	addIfNumber(context, "wallTime", event.wallTime);
	addIfNumber(context, "cpuTime", event.cpuTime);
	addIfNonEmptyString(context, "durableObjectId", event.durableObjectId);

	if (
		isRecord(event.scriptVersion) &&
		isNonEmptyString(event.scriptVersion.id)
	) {
		context.scriptVersionId = event.scriptVersion.id;
	}

	if (Array.isArray(event.scriptTags) && event.scriptTags.length > 0) {
		context.scriptTags = event.scriptTags;
	}

	addIfNonEmptyString(context, "entrypoint", event.entrypoint);
	addIfNonEmptyString(context, "executionModel", event.executionModel);

	if (isTraceFetchEvent(event.event)) {
		const request = event.event.request;
		context.method = request.method;
		context.url = request.url;

		if (
			isRecord(event.event.response) &&
			typeof event.event.response.status === "number"
		) {
			context.status = event.event.response.status;
		}

		if (isRecord(request.cf)) {
			addIfNonEmptyString(context, "colo", request.cf.colo);
			addIfNonEmptyString(context, "country", request.cf.country);
			addIfNonEmptyString(context, "city", request.cf.city);
		}
	}

	if (isTraceCronEvent(event.event)) {
		context.cron = event.event.cron;
		context.scheduledTime = event.event.scheduledTime;
	}

	if (isTraceAlarmEvent(event.event)) {
		context.scheduledTime = event.event.scheduledTime;
	}

	return JSON.stringify(context);
}

function transformEvent(event: TraceItem): LokiStream[] {
	if (!isNonEmptyScriptName(event.scriptName)) {
		return [];
	}

	const streams: LokiStream[] = [];
	type GroupedLogs = {
		level: string;
		source: TraceSource;
		values: LokiLogValue[];
	};

	const logsByGroup = new Map<string, GroupedLogs>();

	const addLog = (
		level: string,
		timestamp: number,
		message: string,
		source: TraceSource,
	) => {
		const logMessage = message.trim();
		if (!logMessage) {
			return;
		}

		const key = `${source}:${level}`;
		const group = logsByGroup.get(key) ?? {
			level,
			source,
			values: [],
		};
		group.values.push([toLogNanoseconds(timestamp), logMessage]);
		logsByGroup.set(key, group);
	};

	const source = getSource(event);
	const contextTimestamp = getContextTimestamp(event);
	addLog("info", contextTimestamp, createContextMessage(event, source), source);

	for (const log of event.logs) {
		if (log.level === "debug") {
			continue;
		}

		const logMessage = log.message.map(jsonToString).join(" ");
		addLog(log.level, log.timestamp, logMessage, source);
	}

	if (Array.isArray(event.diagnosticsChannelEvents)) {
		for (const diagnosticEvent of event.diagnosticsChannelEvents) {
			const message = `[${diagnosticEvent.channel}] ${jsonToString(
				diagnosticEvent.message,
			)}`;
			addLog("info", diagnosticEvent.timestamp, message, "diagnostic");
		}
	}

	if (event.truncated === true) {
		addLog(
			"warn",
			contextTimestamp,
			"[tail] trace item was truncated by Cloudflare",
			source,
		);
	}

	for (const { level, source: groupedSource, values } of logsByGroup.values()) {
		streams.push({
			stream: createLokiLabels(event, level, groupedSource),
			values,
		});
	}

	if (event.exceptions.length) {
		streams.push({
			stream: createLokiLabels(event, "error", source),
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
