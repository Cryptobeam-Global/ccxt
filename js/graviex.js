'use strict';

// ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ArgumentsRequired } = require ('./base/errors');
// const Precise = require ('./base/Precise');

// ---------------------------------------------------------------------------

module.exports = class graviex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'graviex',
            'name': 'Graviex',
            'version': 'v3',
            'countries': [ 'MT', 'RU' ],
            'rateLimit': 1000,
            'has': {
                'CORS': undefined,
                'fetchMarkets': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchBalance': true,
                'fetchCurrencies': false,
                'fetchTrades': true,
                'fetchSimpleTrades': true,
                'fetchOHLCV': true,
                'fetchOrders': false,
                'fetchOrder': false,
                'fetchDepth': true,
                'fetchOrderBook': true,
                'fetchOrderBooks': false,
                'fetchL2OrderBook': false,
                'fetchOrderTrades': false,
                'fetchMyTrades': false,
                'fetchWithdrawals': false,
                'fetchDeposits': false,
                'fetchDepositAddress': true,
                'createOrder': false,
                'cancelOrder': false,
                'createOcoOrder': false,
            },
            'timeframes': {
                '1m': '1',
                '5m': '5',
                '15m': '15',
                '30m': '30',
                '1h': '60',
                '2h': '120',
                '4h': '240',
                '6h': '360',
                '12h': '720',
                '1d': '1440',
                '3d': '4320',
                '1w': '10080',
            },
            'urls': {
                'logo': '',
                'api': {
                    'public': 'https://graviex.net//webapi/v3',
                    'private': 'https://graviex.net//webapi/v3',
                },
                'www': 'https://graviex.net',
                'doc': 'https://graviex.net/documents/api_v3',
                'fees': 'https://graviex.net/documents/fees-and-discounts',
            },
            'api': {
                // market: Unique market id. It's always in the form of xxxyyy, where xxx is the base currency code, yyy is the quote currency code, e.g. 'btccny'. All available markets can be found at /api/v2/markets.
                'public': {
                    'get': [
                        'markets',
                        'tickers',
                        'depth', // Requires market XXXYYY. Optional: asks_limit, bids_limit.
                        'trades', // Requires market XXXYYY. Optional: limit, timestamp, from, to, order_by
                        'trades_simple', // Requires market XXXYYY.
                        'k', // Requires market XXXYYY. Optional: limit, timestamp, period
                        'k_with_pending_trades', // API endpoints exists almost same as k endpoint skipping for now.
                    ],
                },
                'private': {
                    'get': [
                        'order_book', // Requires access_key, tonce, signature and market XXXYYY.
                        'members/me', // Requires access_key, tonce, signature and api secret.
                        'deposits', // Requires access_key, tonce, signature and api secret. Optional currency, limit and state.
                        'deposit', // Requires access_key, tonce, signature, txid and api secret.
                        'deposit_address', // Requires access_key, tonce, signature, currency and api secret.
                        'orders', // Requires access_key, tonce, signature and api secret. Optional market, state, limit, page, order_by
                        'order', // Requires access_key, tonce, signature and api secret AND id (unique orderid).
                        'trades/my', // Requires market XXXYYY, access_key, tonce, signature and api secret . Optional: limit, timestamp, from, to, order_by
                    ],
                    'post': [
                        'orders', // Requires access_key, tonce, signature and api secret AND market, side(sell/buy), volume. Optional price ord_type
                        'orders/multi', // Requires access_key, tonce, signature and api secret AND market, orders, orders[side(sell/buy)], orders[volume]. Optional orders[price], orders[ord_type]. To create multiple orders at once
                        'orders/clear', // Requires access_key, tonce, signature and api secret. Optional side(sell/buy) to only clear orders on one side.
                        'order/delete', // Requires access_key, tonce, signature and api secret AND id (unique orderid).
                    ],
                },
            },
            'fees': {
            },
            'limits': {
                'amount': {
                    'min': 0.001,
                    'max': undefined,
                },
            },
            'precision': {
                'amount': 8,
                'price': 8,
            },
        });
    }

    async fetchMarkets (params = {}) {
        const response = await this.publicGetMarkets ();
        // {
        //     "id": "giobtc",
        //     "name": "GIO/BTC",
        // };
        const markets = response;
        const result = [];
        for (let i = 0; i < markets.length; i++) {
            const market = markets[i];
            const id = this.safeString (market, 'id');
            let symbolParts = this.safeString (market, 'name');
            symbolParts = symbolParts.split ('/');
            const baseId = symbolParts[0];
            const quoteId = symbolParts[1];
            const base = this.commonCurrencyCode (baseId);
            const quote = this.commonCurrencyCode (quoteId);
            const symbol = base + '/' + quote;
            const active = true;
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'active': active,
                'info': markets[i],
            });
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        const timestamp = this.milliseconds ();
        const symbol = market['symbol'];
        // ticker = ticker['ticker'];
        const last = this.safeFloat (ticker, 'last');
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'buy'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'sell'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': this.safeFloat (ticker, 'change'),
            'percentage': undefined,
            'average': undefined,
            'baseVolume': this.safeFloat (ticker, 'volume'),
            'quoteVolume': this.safeFloat (ticker, 'volume2'),
            'info': ticker,
        };
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market': market['id'],
        };
        const response = await this.publicGetTickers (this.extend (request, params));
        // {
        //     "name": "GIO/BTC",
        //     "base_unit": "gio",
        //     "base_fixed": 4,
        //     "base_fee": 0.002,
        //     "quote_unit": "btc",
        //     "quote_fixed": 8,
        //     "quote_fee": 0.002,
        //     "api": true,
        //     "base_lot": null,
        //     "quote_lot": null,
        //     "base_min": "0.00000010",
        //     "quote_min": "0.00000010",
        //     "blocks": 260722,
        //     "block_time": "2022-01-31 14:10:08",
        //     "wstatus": "on",
        //     "low": "0.0000005",
        //     "high": "0.00000058",
        //     "last": "0.00000058",
        //     "open": "0.000000510",
        //     "volume": "70673.0412",
        //     "volume2": "0.03837782973",
        //     "sell": "0.00000058",
        //     "buy": "0.00000055",
        //     "at": 1643628427,
        // },
        if (Array.isArray (response)) {
            const firstTicker = this.safeValue (response, 0, {});
            return this.parseTicker (firstTicker, market);
        }
        return this.parseTicker (response, market);
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        const response = await this.publicGetTickers (params);
        // {
        //   "giobtc": {
        //     "name": "GIO/BTC",
        //     "base_unit": "gio",
        //     "base_fixed": 4,
        //     "base_fee": 0.002,
        //     "quote_unit": "btc",
        //     "quote_fixed": 8,
        //     "quote_fee": 0.002,
        //     "api": true,
        //     "base_lot": null,
        //     "quote_lot": null,
        //     "base_min": "0.00000010",
        //     "quote_min": "0.00000010",
        //     "blocks": 260722,
        //     "block_time": "2022-01-31 14:10:08",
        //     "wstatus": "on",
        //     "low": "0.0000005",
        //     "high": "0.00000058",
        //     "last": "0.00000058",
        //     "open": "0.000000510",
        //     "volume": "70673.0412",
        //     "volume2": "0.03837782973",
        //     "sell": "0.00000057",
        //     "buy": "0.00000055",
        //     "at": 1643628325,
        //   },
        // },
        // const data = response;
        // let timestamp = data['at'];
        // let tickers = data['ticker'];
        const ids = Object.keys (response);
        const result = {};
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const market = this.safeMarket (id);
            const symbol = market['symbol'];
            result[symbol] = this.parseTicker (response[id], market);
        }
        return result;
    }

    parseTrade (trade, market = undefined) {
        const price = this.safeString2 (trade, 'p', 'price');
        const amount = this.safeString2 (trade, 'volume', 'amount');
        const funds = this.safeString (trade, 'funds');
        const marketId = this.safeString (trade, 'symbol');
        const symbol = this.safeSymbol (marketId, market);
        const datetime = this.safeValue (trade, 'created_at');
        let timestamp = this.parse_date (datetime);
        let id = this.safeString2 (trade, 't', 'a');
        id = this.safeString2 (trade, 'id', 'tid', id);
        const side = this.safeValue (trade, 'side');
        const fee = undefined;
        const cost = undefined;
        let type = undefined;
        let takerOrMaker = undefined;
        const orderId = this.safeString (trade, 'id');
        if ('side' in trade) {
            if (trade['side'] === 'buy') {
                takerOrMaker = 'maker';
            } else {
                takerOrMaker = 'taker';
            }
        }
        if ('date' in trade) {
            timestamp = this.safeInteger2 (trade, 'T', 'date');
        }
        if ('type' in trade) {
            type = this.safeValue (trade, 'type');
        }
        if ('type' in trade) {
            if (trade['type'] === 'buy') {
                takerOrMaker = 'maker';
            } else {
                takerOrMaker = 'taker';
            }
        }
        return this.safeTrade ({
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'id': id,
            'order': orderId,
            'type': type,
            'side': side,
            'takerOrMaker': takerOrMaker,
            'price': price,
            'funds': funds,
            'amount': amount,
            'cost': cost,
            'fee': fee,
        }, market);
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market': market['id'],
        };
        const query = this.omit (params, 'type');
        if (limit !== undefined) {
            request['limit'] = limit; // default: 500
        }
        const response = await this.publicGetTrades (this.extend (request, query));
        // [
        //     {
        //         "id": 14473952,
        //         "at": 1643681026,
        //         "price": "0.00000056",
        //         "volume": "0.2",
        //         "funds": "0.000000112",
        //         "market": "giobtc",
        //         "created_at": "2022-02-01T05:03:46+03:00",
        //         "side": "sell"
        //     },
        //     {
        //         "id": 14473615,
        //         "at": 1643670349,
        //         "price": "0.00000059",
        //         "volume": "515.0136",
        //         "funds": "0.000303858024",
        //         "market": "giobtc",
        //         "created_at": "2022-02-01T02:05:49+03:00",
        //         "side": "buy"
        //     },
        // ],
        return this.parseTrades (response, market, since, limit);
    }

    async fetchSimpleTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market': market['id'],
        };
        const response = await this.publicGetTradesSimple (this.extend (request));
        // [
        //     {
        //         "tid": 14474652,
        //         "type": "buy",
        //         "date": 1643706195,
        //         "price": "0.00000058",
        //         "amount": "172.4655"
        //     },
        //     {
        //         "tid": 14474645,
        //         "type": "buy",
        //         "date": 1643705999,
        //         "price": "0.00000058",
        //         "amount": "133.0"
        //     },
        // ],
        return this.parseTrades (response, market, since, limit);
    }

    parseOHLCV (ohlcv, market = undefined) {
        return [
            this.safeInteger (ohlcv, 0),
            this.safeNumber (ohlcv, 1),
            this.safeNumber (ohlcv, 2),
            this.safeNumber (ohlcv, 3),
            this.safeNumber (ohlcv, 4),
            this.safeNumber (ohlcv, 5),
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const defaultLimit = 50;
        const maxLimit = 1500;
        limit = (limit === undefined) ? defaultLimit : Math.min (limit, maxLimit);
        const request = {
            'market': market['id'],
            'limit': limit,
        };
        const response = await this.publicGetK (this.extend (request));
        // [
        //     [
        //         1643719320,
        //         6.5e-7,
        //         6.5e-7,
        //         6.5e-7,
        //         6.5e-7,
        //         0,
        //     ],
        //     [
        //         1643719380,
        //         6.5e-7,
        //         6.5e-7,
        //         6.5e-7,
        //         6.5e-7,
        //         0,
        //     ],
        // ],
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    async fetchDepth (symbol, limit = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOrderBook() requires a symbol argument');
        }
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market': market['id'],
        };
        if (limit !== undefined) {
            request['limit'] = limit; // default 100,
        }
        const response = await this.publicGetDepth (this.extend (request, params));
        // {
        //   "timestamp": 1643721617,
        //   "asks": [
        //     [
        //       "0.00000253",
        //       "120.0"
        //     ],
        //     [
        //       "0.0000025",
        //       "2424.0288"
        //     ],
        //     [
        //       "0.00000249",
        //       "77.577"
        //     ],
        //     [
        //       "0.00000248",
        //       "12.5"
        //     ],
        // },
        const timestamp = this.safeInteger (response, 'timestamp');
        const orderbook = this.parseOrderBook (response, symbol, timestamp);
        orderbook['nonce'] = this.milliseconds ();
        return orderbook;
    }

    parseBalance (response) {
        const balances = this.safeValue (response, 'accounts_filtered');
        const result = { 'info': balances };
        for (let i = 0; i < balances.length; i++) {
            const balance = balances[i];
            const currencyId = this.safeString (balance, 'currency');
            const code = this.safeCurrencyCode (currencyId);
            const account = this.account ();
            account['free'] = this.safeString (balance, 'balance');
            account['used'] = this.safeString (balance, 'locked');
            result[code] = account;
        }
        return this.safeBalance (result);
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        const response = await this.privateGetMembersMe (params);
        // {
        //     "sn": "GRAK6GDVXKNVIEX",
        //     "name": null,
        //     "email": "XXXXXXXXXXXXX",
        //     "activated": true,
        //     "verified": false,
        //     "accounts_filtered": [
        //     {
        //         "currency": "gio",
        //         "name": "GravioCoin",
        //         "balance": "0.0",
        //         "locked": "0.0",
        //         "status": "ok",
        //         "is_purged": false,
        //         "is_coin": true
        //     }
        //     ]
        // }
        return this.parseBalance (response);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOrderBook() requires a symbol argument');
        }
        await this.loadMarkets ();
        const request = {
            'market': this.marketId (symbol),
        };
        const response = await this.privateGetOrderBook (this.extend (request, params));
        const orderbook = this.safeValue (response, 'payload');
        const timestamp = this.parse8601 (this.safeString (orderbook, 'updated_at'));
        return this.parseOrderBook (orderbook, symbol, timestamp, 'bids', 'asks', 'price', 'amount');
    }

    parseDepositAddress (depositAddress, currency = undefined) {
        const code = (currency === undefined) ? undefined : currency['code'];
        let address = this.safeString (depositAddress, 'address');
        let tag = undefined;
        if (address !== undefined) {
            const parts = address.split (':');
            address = this.safeString (parts, 0);
            tag = this.safeString (parts, 1);
        }
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'tag': tag,
            'network': undefined,
            'info': depositAddress,
        };
    }

    async fetchDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request = {
            'currency': currency['id'].toLowerCase (),
        };
        const response = await this.privateGetDepositAddress (this.extend (request, params));
        const data = this.safeValue (response, 'data', {});
        return this.parseDepositAddress (data, currency);
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api] + '/' + path;
        const request = '/webapi/v3/' + path;
        const query = this.omit (params, this.extractParams (path));
        if (api === 'public') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else {
            this.checkRequiredCredentials ();
            const nonce = this.nonce ().toString ();
            const query = this.urlencode (this.extend ({
                'access_key': this.apiKey,
                'tonce': nonce,
            }, params));
            const payload = method + '|' + request + '|' + query;
            // const signed = this.hmac (payload, this.secret, 'sha256');
            const signed = this.hmac (this.encode (payload), this.encode (this.secret), 'sha256');
            const suffix = query + '&signature=' + signed;
            // const tonce = this.nonce ();
            // params['tonce'] = tonce;
            // params['access_key'] = this.apiKey;
            // const sorted = this.keysort (params);
            // let paramencoded = this.urlencode (sorted);
            // const sign_str = method + '|' + request + '|' + paramencoded;
            // const signature = this.hmac (sign_str, this.secret, 'sha256');
            // sorted['signature'] = signature;
            // paramencoded = this.urlencode (sorted);
            if (method === 'GET') {
                url += '?' + suffix;
            } else {
                body = suffix;
                headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    async request (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined, config = {}, context = {}) {
        const response = await this.fetch2 (path, api, method, params, headers, body, config, context);
        return response;
    }

    handleErrors (code, reason, url, method, headers, body, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return '1'; // return;
        }
    }
};
