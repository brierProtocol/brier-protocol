export interface BrierConfig {
    apiKey: string;
    apiSecret: string;
    baseUrl?: string;
}
export interface PredictionPayload {
    marketId: string;
    marketTitle?: string;
    forecast: number;
}
export declare class BrierClient {
    private apiKey;
    private apiSecret;
    private baseUrl;
    constructor(config: BrierConfig);
    /**
     * Commit a prediction to the Brier Protocol Reputation Layer.
     * This function automatically adds the timestamp and HMAC-SHA256 signature.
     */
    predict(payload: PredictionPayload): Promise<any>;
}
