import bitpandaRest from '../bitpanda.js';
import { Int, Str } from '../base/types.js';
import Client from '../base/ws/Client.js';
export default class bitpanda extends bitpandaRest {
    describe(): any;
    watchBalance(params?: {}): Promise<any>;
    handleBalanceSnapshot(client: any, message: any): void;
    watchTicker(symbol: string, params?: {}): Promise<any>;
    watchTickers(symbols?: string[], params?: {}): Promise<any>;
    handleTicker(client: Client, message: any): void;
    parseWSTicker(ticker: any, market?: any): import("../base/types.js").Ticker;
    watchMyTrades(symbol?: Str, since?: Int, limit?: Int, params?: {}): any;
    watchOrderBook(symbol: string, limit?: Int, params?: {}): Promise<any>;
    handleOrderBook(client: Client, message: any): void;
    handleDelta(orderbook: any, delta: any): void;
    handleDeltas(orderbook: any, deltas: any): void;
    watchOrders(symbol?: Str, since?: Int, limit?: Int, params?: {}): any;
    handleTrading(client: Client, message: any): void;
    parseTradingOrder(order: any, market?: any): import("../base/types.js").Order;
    parseTradingOrderStatus(status: any): string;
    handleOrders(client: Client, message: any): void;
    handleAccountUpdate(client: Client, message: any): void;
    parseWsOrderStatus(status: any): string;
    updateBalance(balance: any): void;
    watchOHLCV(symbol: string, timeframe?: string, since?: Int, limit?: Int, params?: {}): Promise<any>;
    handleOHLCV(client: Client, message: any): void;
    findTimeframe(timeframe: any, timeframes?: any): string;
    handleSubscriptions(client: Client, message: any): any;
    handleHeartbeat(client: Client, message: any): any;
    handleErrorMessage(client: Client, message: any): void;
    handleMessage(client: Client, message: any): any;
    handlePricePointUpdates(client: Client, message: any): any;
    handleAuthenticationMessage(client: Client, message: any): any;
    watchMultiple(messageHash: any, request: any, subscriptionHash: any, symbols?: string[], params?: {}): Promise<any>;
    authenticate(params?: {}): Promise<any>;
}
