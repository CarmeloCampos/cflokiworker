export type MaybeNull<T> = T | null;

export type MaybeUndefined<T> = T | undefined;

export type MaybeOptional<T> = MaybeNull<MaybeUndefined<T>>;

export type TraceOutcome = "ok" | "exception" | string;

export type AcceptedTraceOutcome = "ok" | "exception";

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

export type TraceItem = {
	outcome: TraceOutcome;
	scriptName?: MaybeNull<string>;
	logs: ReadonlyArray<TraceLog>;
	exceptions: ReadonlyArray<TraceException>;
};

export type Env = {
	LOKI_PUSH_URL: string;
	LOKI_CREDENTIALS?: string;
};

export type LokiLogValue = readonly [timestamp: string, message: string];

export type LokiStream = {
	stream: {
		level: string;
		outcome: AcceptedTraceOutcome;
		app: string;
	};
	values: ReadonlyArray<LokiLogValue>;
};
