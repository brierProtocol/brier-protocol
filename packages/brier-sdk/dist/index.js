"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrierClient = void 0;
const crypto = __importStar(require("crypto"));
class BrierClient {
    apiKey;
    apiSecret;
    baseUrl;
    constructor(config) {
        if (!config.apiKey || !config.apiSecret) {
            throw new Error('BrierClient requires apiKey and apiSecret');
        }
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.baseUrl = config.baseUrl || 'http://localhost:3000/api';
    }
    /**
     * Commit a prediction to the Brier Protocol Reputation Layer.
     * This function automatically adds the timestamp and HMAC-SHA256 signature.
     */
    async predict(payload) {
        if (payload.forecast < 0 || payload.forecast > 1) {
            throw new Error('Forecast must be between 0.0 and 1.0');
        }
        const timestamp = Date.now().toString();
        const rawBody = JSON.stringify(payload);
        // Compute HMAC-SHA256 signature
        const signature = crypto
            .createHmac('sha256', this.apiSecret)
            .update(timestamp + rawBody)
            .digest('hex');
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'x-timestamp': timestamp,
            'x-signature': signature,
        };
        const response = await fetch(`${this.baseUrl}/predictions/commit`, {
            method: 'POST',
            headers,
            body: rawBody,
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Brier API Error [${response.status}]: ${data.error || JSON.stringify(data)}`);
        }
        return data;
    }
}
exports.BrierClient = BrierClient;
