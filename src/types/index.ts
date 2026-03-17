export type MaybeNull<T> = T | null;

export type MaybeUndefined<T> = T | undefined;

export type MaybeOptional<T> = MaybeNull<MaybeUndefined<T>>;

export type TraceOutcome =
	| "unknown"
	| "ok"
	| "exception"
	| "exceededCpu"
	| "exceededMemory"
	| "scriptNotFound"
	| "canceled"
	| "responseStreamDisconnected"
	| string;

export type TraceSource = "fetch" | "cron" | "alarm" | "unknown" | "diagnostic";

export type TraceLogLevel = string;

export type TraceLog = {
	level: TraceLogLevel;
	timestamp: number;
	message: ReadonlyArray<unknown>;
};

export type TraceException = {
	name: string;
	message: string;
	timestamp: number;
};

export type TraceRequestCf = {
	colo?: string;
	country?: string;
	city?: string;
	[key: string]: unknown;
};

export type TraceFetchRequest = {
	url: string;
	method: string;
	headers: Readonly<Record<string, string>>;
	cf?: MaybeNull<TraceRequestCf>;
};

export type TraceFetchResponse = {
	status: number;
};

export type TraceFetchEvent = {
	request: TraceFetchRequest;
	response?: MaybeOptional<TraceFetchResponse>;
};

export type TraceCronEvent = {
	cron: string;
	scheduledTime: number;
};

export type TraceAlarmEvent = {
	scheduledTime: string;
};

export type DiagnosticsChannelEvent = {
	channel: string;
	message: unknown;
	timestamp: number;
};

export type ScriptVersion = {
	id?: MaybeOptional<string>;
};

export type TraceItem = {
	outcome: TraceOutcome;
	scriptName?: MaybeNull<string>;
	logs: ReadonlyArray<TraceLog>;
	exceptions: ReadonlyArray<TraceException>;
	eventTimestamp?: MaybeOptional<number>;
	event?: MaybeOptional<unknown>;
	diagnosticsChannelEvents?: MaybeOptional<
		ReadonlyArray<DiagnosticsChannelEvent>
	>;
	scriptTags?: MaybeOptional<ReadonlyArray<string>>;
	scriptVersion?: MaybeOptional<ScriptVersion>;
	entrypoint?: MaybeOptional<string>;
	executionModel?: MaybeOptional<string>;
	durableObjectId?: MaybeOptional<string>;
	wallTime?: MaybeOptional<number>;
	cpuTime?: MaybeOptional<number>;
	truncated?: MaybeOptional<boolean>;
};

export type Env = {
	LOKI_PUSH_URL: string;
	LOKI_CREDENTIALS?: string;
};

export type LokiLogValue = readonly [timestamp: string, message: string];

export type LokiStream = {
	stream: {
		level: string;
		outcome: string;
		app: string;
		source?: TraceSource;
		entrypoint?: string;
		executionModel?: string;
	};
	values: ReadonlyArray<LokiLogValue>;
};
