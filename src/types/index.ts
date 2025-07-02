export type TraceItem = {
	outcome: string;
	scriptName?: string;
	logs: {
		level: string;
		timestamp: number;
		message: [string];
	}[];
	exceptions: {
		name: string;
		message: string;
		timestamp: number;
	}[];
};

export type Env = {
	LOKI_PUSH_URL: string;
	LOKI_CREDENTIALS?: string;
};

export type LokiStream = {
	stream: {
		level: string;
		outcome: string;
		app: string;
	};
	values: [string, string][];
};

export type LogsByLevel = Record<string, [string, string][]>;
