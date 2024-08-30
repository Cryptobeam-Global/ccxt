
// ---------------------------------------------------------------------------

import Exchange from './abstract/kucoin.js';
import { ExchangeError, ExchangeNotAvailable, InsufficientFunds, OrderNotFound, InvalidOrder, AccountSuspended, InvalidNonce, NotSupported, BadRequest, AuthenticationError, BadSymbol, RateLimitExceeded, PermissionDenied, InvalidAddress, ArgumentsRequired } from './base/errors.js';
import { Precise } from './base/Precise.js';
import { TICK_SIZE, TRUNCATE } from './base/functions/number.js';
import { sha256 } from './static_dependencies/noble-hashes/sha256.js';
import type { TransferEntry, Int, OrderSide, OrderType, Order, OHLCV, Trade, Balances, OrderRequest, Str, Transaction, Ticker, OrderBook, Tickers, Strings, Currency, Market, Num, Account, Dict, Bool, TradingFeeInterface, Currencies, int } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class kucoin
 * @augments Exchange
 */
export default class kucoin extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'kucoin',
            'name': 'KuCoin',
            'countries': [ 'SC' ],
            'rateLimit': 10, // 100 requests per second => ( 1000ms / 100 ) = 10 ms between requests on average
            'version': 'v2',
            'certified': true,
            'pro': true,
            'comment': 'Platform 2.0',
            'quoteJsonNumbers': false,
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': false,
                'future': false,
                'option': false,
                'borrowCrossMargin': true,
                'borrowIsolatedMargin': true,
                'cancelAllOrders': true,
                'cancelOrder': true,
                'closeAllPositions': false,
                'closePosition': false,
                'createDepositAddress': true,
                'createMarketBuyOrderWithCost': true,
                'createMarketOrderWithCost': true,
                'createMarketSellOrderWithCost': true,
                'createOrder': true,
                'createOrders': true,
                'createPostOnlyOrder': true,
                'createStopLimitOrder': true,
                'createStopMarketOrder': true,
                'createStopOrder': true,
                'createTriggerOrder': true,
                'editOrder': true,
                'fetchAccounts': true,
                'fetchBalance': true,
                'fetchBorrowInterest': true,
                'fetchBorrowRateHistories': true,
                'fetchBorrowRateHistory': true,
                'fetchClosedOrders': true,
                'fetchCrossBorrowRate': false,
                'fetchCrossBorrowRates': false,
                'fetchCurrencies': true,
                'fetchDepositAddress': true,
                'fetchDepositAddressesByNetwork': true,
                'fetchDeposits': true,
                'fetchDepositWithdrawFee': true,
                'fetchDepositWithdrawFees': true,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchIsolatedBorrowRate': false,
                'fetchIsolatedBorrowRates': false,
                'fetchL3OrderBook': true,
                'fetchLedger': true,
                'fetchLeverageTiers': false,
                'fetchMarginAdjustmentHistory': false,
                'fetchMarginMode': false,
                'fetchMarketLeverageTiers': false,
                'fetchMarkets': true,
                'fetchMarkOHLCV': false,
                'fetchMyTrades': true,
                'fetchOHLCV': true,
                'fetchOpenInterest': false,
                'fetchOpenInterestHistory': false,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchOrderBook': true,
                'fetchOrderBooks': false,
                'fetchOrdersByStatus': true,
                'fetchOrderTrades': true,
                'fetchPositionHistory': false,
                'fetchPositionMode': false,
                'fetchPositionsHistory': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchStatus': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchTime': true,
                'fetchTrades': true,
                'fetchTradingFee': true,
                'fetchTradingFees': false,
                'fetchTransactionFee': true,
                'fetchTransfers': false,
                'fetchWithdrawals': true,
                'repayCrossMargin': true,
                'repayIsolatedMargin': true,
                'setLeverage': true,
                'setMarginMode': false,
                'setPositionMode': false,
                'signIn': false,
                'transfer': true,
                'withdraw': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/51840849/87295558-132aaf80-c50e-11ea-9801-a2fb0c57c799.jpg',
                'referral': 'https://www.kucoin.com/ucenter/signup?rcode=E5wkqe',
                'api': {
                    'public': 'https://api.kucoin.com',
                    'private': 'https://api.kucoin.com',
                    'futuresPrivate': 'https://api-futures.kucoin.com',
                    'futuresPublic': 'https://api-futures.kucoin.com',
                    'webExchange': 'https://kucoin.com/_api',
                    'broker': 'https://api-broker.kucoin.com',
                    'earn': 'https://api.kucoin.com',
                },
                'www': 'https://www.kucoin.com',
                'doc': [
                    'https://docs.kucoin.com',
                ],
            },
            'requiredCredentials': {
                'apiKey': true,
                'secret': true,
                'password': true,
            },
            'api': {
                // level VIP0
                // Spot => 3000/30s => 100/s
                // Weight = x => 100/(100/x) = x
                // Futures Management Public => 2000/30s => 200/3/s
                // Weight = x => 100/(200/3/x) = x*1.5
                'public': {
                    'get': {
                        // spot trading
                        'currencies': 4.5, // 3PW
                        'currencies/{currency}': 4.5, // 3PW
                        'symbols': 6, // 4PW
                        'market/orderbook/level1': 3, // 2PW
                        'market/allTickers': 22.5, // 15PW
                        'market/stats': 22.5, // 15PW
                        'markets': 4.5, // 3PW
                        'market/orderbook/level{level}_{limit}': 6, // 4PW
                        'market/orderbook/level2_20': 3, // 2PW
                        'market/orderbook/level2_100': 6, // 4PW
                        'market/histories': 4.5, // 3PW
                        'market/candles': 4.5, // 3PW
                        'prices': 4.5, // 3PW
                        'timestamp': 4.5, // 3PW
                        'status': 4.5, // 3PW
                        // margin trading
                        'mark-price/{symbol}/current': 3, // 2PW
                        'mark-price/all-symbols': 3,
                        'margin/config': 25, // 25SW
                    },
                    'post': {
                        // ws
                        'bullet-public': 15, // 10PW
                    },
                },
                'private': {
                    'get': {
                        // account
                        'user-info': 30, // 20MW
                        'accounts': 7.5, // 5MW
                        'accounts/{accountId}': 7.5, // 5MW
                        'accounts/ledgers': 3, // 2MW
                        'hf/accounts/ledgers': 2, // 2SW
                        'hf/margin/account/ledgers': 2, // 2SW
                        'transaction-history': 3, // 2MW
                        'sub/user': 30, // 20MW
                        'sub-accounts/{subUserId}': 22.5, // 15MW
                        'sub-accounts': 30, // 20MW
                        'sub/api-key': 30, // 20MW
                        // funding
                        'margin/account': 40, // 40SW
                        'margin/accounts': 15, // 15SW
                        'isolated/accounts': 15, // 15SW
                        'deposit-addresses': 7.5, // 5MW
                        'deposits': 7.5, // 5MW
                        'hist-deposits': 7.5, // 5MW
                        'withdrawals': 30, // 20MW
                        'hist-withdrawals': 30, // 20MW
                        'withdrawals/quotas': 30, // 20MW
                        'accounts/transferable': 30, // 20MW
                        'transfer-list': 30, // 20MW
                        'base-fee': 3, // 3SW
                        'trade-fees': 3, // 3SW
                        // spot trading
                        'market/orderbook/level{level}': 3, // 3SW
                        'market/orderbook/level2': 3, // 3SW
                        'market/orderbook/level3': 3, // 3SW
                        'hf/orders/active': 2, // 2SW
                        'hf/orders/active/symbols': 2, // 2SW
                        'hf/margin/order/active/symbols': 2, // 2SW
                        'hf/orders/done': 2, // 2SW
                        'hf/orders/{orderId}': 2, // 2SW
                        'hf/orders/client-order/{clientOid}': 2, // 2SW
                        'hf/orders/dead-cancel-all/query': 2, // 2SW
                        'hf/fills': 2, // 2SW
                        'orders': 2, // 2SW
                        'limit/orders': 3, // 3SW
                        'orders/{orderId}': 2, // 2SW
                        'order/client-order/{clientOid}': 3, // 3SW
                        'fills': 10, // 10SW
                        'limit/fills': 20, // 20SW
                        'stop-order': 8, // 8SW
                        'stop-order/{orderId}': 3, // 3SW
                        'stop-order/queryOrderByClientOid': 3, // 3SW
                        'oco/order/{orderId}': 2, // 2SW
                        'oco/order/details/{orderId}': 2, // 2SW
                        'oco/client-order/{clientOid}': 2, // 2SW
                        'oco/orders': 2, // 2SW
                        // margin trading
                        'hf/margin/orders/active': 4, // 4SW
                        'hf/margin/orders/done': 10, // 10SW
                        'hf/margin/orders/{orderId}': 4, // 4SW
                        'hf/margin/orders/client-order/{clientOid}': 5, // 5SW
                        'hf/margin/fills': 5, // 5SW
                        'etf/info': 25, // 25SW
                        'margin/currencies': 20, // 20SW
                        'risk/limit/strategy': 20, // 20SW (Deprecate)
                        'isolated/symbols': 20, // 20SW
                        'margin/symbols': 5,
                        'isolated/account/{symbol}': 50, // 50SW
                        'margin/borrow': 15, // 15SW
                        'margin/repay': 15, // 15SW
                        'margin/interest': 20, // 20SW
                        'project/list': 10, // 10SW
                        'project/marketInterestRate': 7.5, // 5PW
                        'redeem/orders': 10, // 10SW
                        'purchase/orders': 10, // 10SW
                        // broker
                        'broker/api/rebase/download': 3,
                        'migrate/user/account/status': 3,
                        // affiliate
                        'affiliate/inviter/statistics': 30,
                    },
                    'post': {
                        // account
                        'sub/user/created': 22.5, // 15MW
                        'sub/api-key': 30, // 20MW
                        'sub/api-key/update': 45, // 30MW
                        // funding
                        'deposit-addresses': 30, // 20MW
                        'withdrawals': 7.5, // 5MW
                        'accounts/universal-transfer': 6, // 4MW
                        'accounts/sub-transfer': 45, // 30MW
                        'accounts/inner-transfer': 15, // 10MW
                        'transfer-out': 30, // 20MW
                        'transfer-in': 30, // 20MW
                        // spot trading
                        'hf/orders': 1, // 1SW
                        'hf/orders/test': 1, // 1SW
                        'hf/orders/sync': 1, // 1SW
                        'hf/orders/multi': 1, // 1SW
                        'hf/orders/multi/sync': 1, // 1SW
                        'hf/orders/alter': 3, // 3SW
                        'hf/orders/dead-cancel-all': 2, // 2SW
                        'orders': 2, // 2SW
                        'orders/test': 2, // 2SW
                        'orders/multi': 3, // 3SW
                        'stop-order': 2, // 2SW
                        'oco/order': 2, // 2SW
                        // margin trading
                        'hf/margin/order': 5, // 5SW
                        'hf/margin/order/test': 5, // 5SW
                        'margin/order': 5, // 5SW
                        'margin/order/test': 5, // 5SW
                        'margin/borrow': 15, // 15SW
                        'margin/repay': 10, // 10SW
                        'purchase': 15, // 15SW
                        'redeem': 15, // 15SW
                        'lend/purchase/update': 10, // 10SW
                        // ws
                        'bullet-private': 10, // 10SW
                        'position/update-user-leverage': 5,
                    },
                    'delete': {
                        // account
                        'sub/api-key': 45, // 30MW
                        // funding
                        'withdrawals/{withdrawalId}': 30, // 20MW
                        // spot trading
                        'hf/orders/{orderId}': 1, // 1SW
                        'hf/orders/sync/{orderId}': 1, // 1SW
                        'hf/orders/client-order/{clientOid}': 1, // 1SW
                        'hf/orders/sync/client-order/{clientOid}': 1, // 1SW
                        'hf/orders/cancel/{orderId}': 2, // 2SW
                        'hf/orders': 2, // 2SW
                        'hf/orders/cancelAll': 30, // 30SW
                        'orders/{orderId}': 3, // 3SW
                        'order/client-order/{clientOid}': 5, // 5SW
                        'orders': 20, // 20SW
                        'stop-order/{orderId}': 3, // 3SW
                        'stop-order/cancelOrderByClientOid': 5, // 5SW
                        'stop-order/cancel': 3, // 3SW
                        'oco/order/{orderId}': 3, // 3SW
                        'oco/client-order/{clientOid}': 3, // 3SW
                        'oco/orders': 3, // 3SW
                        // margin trading
                        'hf/margin/orders/{orderId}': 5, // 5SW
                        'hf/margin/orders/client-order/{clientOid}': 5, // 5SW
                        'hf/margin/orders': 10, // 10SW
                    },
                },
                'futuresPublic': {
                    'get': {
                        'contracts/active': 4.5, // 3PW
                        'contracts/{symbol}': 4.5, // 3PW
                        'ticker': 3, // 2PW
                        'level2/snapshot': 4.5, // 3PW
                        'level2/depth20': 7.5, // 5PW
                        'level2/depth100': 15, // 10PW
                        'trade/history': 7.5, // 5PW
                        'kline/query': 4.5, // 3PW
                        'interest/query': 7.5, // 5PW
                        'index/query': 3, // 2PW
                        'mark-price/{symbol}/current': 4.5, // 3PW
                        'premium/query': 4.5, // 3PW
                        'trade-statistics': 4.5, // 3PW
                        'funding-rate/{symbol}/current': 3, // 2PW
                        'contract/funding-rates': 7.5, // 5PW
                        'timestamp': 3, // 2PW
                        'status': 6, // 4PW
                        // ?
                        'level2/message/query': 1.3953,
                    },
                    'post': {
                        // ws
                        'bullet-public': 15, // 10PW
                    },
                },
                'futuresPrivate': {
                    'get': {
                        // account
                        'transaction-history': 3, // 2MW
                        // funding
                        'account-overview': 7.5, // 5FW
                        'account-overview-all': 9, // 6FW
                        'transfer-list': 30, // 20MW
                        // futures
                        'orders': 3, // 2FW
                        'stopOrders': 9, // 6FW
                        'recentDoneOrders': 7.5, // 5FW
                        'orders/{orderId}': 7.5, // 5FW
                        'orders/byClientOid': 7.5, // 5FW
                        'fills': 7.5, // 5FW
                        'recentFills': 4.5, // 3FW
                        'openOrderStatistics': 15, // 10FW
                        'position': 3, // 2FW
                        'positions': 3, // 2FW
                        'margin/maxWithdrawMargin': 15, // 10FW
                        'contracts/risk-limit/{symbol}': 7.5, // 5FW
                        'funding-history': 7.5, // 5FW
                    },
                    'post': {
                        // funding
                        'transfer-out': 30, // 20MW
                        'transfer-in': 30, // 20MW
                        // futures
                        'orders': 3, // 2FW
                        'orders/test': 3, // 2FW
                        'orders/multi': 4.5, // 3FW
                        'position/margin/auto-deposit-status': 6, // 4FW
                        'margin/withdrawMargin': 15, // 10FW
                        'position/margin/deposit-margin': 6, // 4FW
                        'position/risk-limit-level/change': 6, // 4FW
                        // ws
                        'bullet-private': 15, // 10FW
                    },
                    'delete': {
                        'orders/{orderId}': 1.5, // 1FW
                        'orders/client-order/{clientOid}': 1.5, // 1FW
                        'orders': 45, // 30FW
                        'stopOrders': 22.5, // 15FW
                    },
                },
                'webExchange': {
                    'get': {
                        'currency/currency/chain-info': 1, // this is temporary from webApi
                    },
                },
                'broker': {
                    'get': {
                        'broker/nd/info': 2,
                        'broker/nd/account': 2,
                        'broker/nd/account/apikey': 2,
                        'broker/nd/rebase/download': 3,
                        'asset/ndbroker/deposit/list': 1,
                        'broker/nd/transfer/detail': 1,
                        'broker/nd/deposit/detail': 1,
                        'broker/nd/withdraw/detail': 1,
                    },
                    'post': {
                        'broker/nd/transfer': 1,
                        'broker/nd/account': 3,
                        'broker/nd/account/apikey': 3,
                        'broker/nd/account/update-apikey': 3,
                    },
                    'delete': {
                        'broker/nd/account/apikey': 3,
                    },
                },
                'earn': {
                    'get': {
                        'otc-loan/loan': 1,
                        'otc-loan/accounts': 1,
                        'earn/redeem-preview': 7.5, // 5EW
                        'earn/saving/products': 7.5, // 5EW
                        'earn/hold-assets': 7.5, // 5EW
                        'earn/promotion/products': 7.5, // 5EW
                        'earn/kcs-staking/products': 7.5, // 5EW
                        'earn/staking/products': 7.5, // 5EW
                        'earn/eth-staking/products': 7.5, // 5EW
                    },
                    'post': {
                        'earn/orders': 7.5, // 5EW
                    },
                    'delete': {
                        'earn/orders': 7.5, // 5EW
                    },
                },
            },
            'timeframes': {
                '1m': '1min',
                '3m': '3min',
                '5m': '5min',
                '15m': '15min',
                '30m': '30min',
                '1h': '1hour',
                '2h': '2hour',
                '4h': '4hour',
                '6h': '6hour',
                '8h': '8hour',
                '12h': '12hour',
                '1d': '1day',
                '1w': '1week',
                '1M': '1month',
            },
            'precisionMode': TICK_SIZE,
            'exceptions': {
                'exact': {
                    'order not exist': OrderNotFound,
                    'order not exist.': OrderNotFound, // duplicated error temporarily
                    'order_not_exist': OrderNotFound, // {"code":"order_not_exist","msg":"order_not_exist"} ¯\_(ツ)_/¯
                    'order_not_exist_or_not_allow_to_cancel': InvalidOrder, // {"code":"400100","msg":"order_not_exist_or_not_allow_to_cancel"}
                    'Order size below the minimum requirement.': InvalidOrder, // {"code":"400100","msg":"Order size below the minimum requirement."}
                    'The withdrawal amount is below the minimum requirement.': ExchangeError, // {"code":"400100","msg":"The withdrawal amount is below the minimum requirement."}
                    'Unsuccessful! Exceeded the max. funds out-transfer limit': InsufficientFunds, // {"code":"200000","msg":"Unsuccessful! Exceeded the max. funds out-transfer limit"}
                    'The amount increment is invalid.': BadRequest,
                    'The quantity is below the minimum requirement.': InvalidOrder, // {"msg":"The quantity is below the minimum requirement.","code":"400100"}
                    '400': BadRequest,
                    '401': AuthenticationError,
                    '403': NotSupported,
                    '404': NotSupported,
                    '405': NotSupported,
                    '415': NotSupported,
                    '429': RateLimitExceeded,
                    '500': ExchangeNotAvailable, // Internal Server Error -- We had a problem with our server. Try again later.
                    '503': ExchangeNotAvailable,
                    '101030': PermissionDenied, // {"code":"101030","msg":"You haven't yet enabled the margin trading"}
                    '103000': InvalidOrder, // {"code":"103000","msg":"Exceed the borrowing limit, the remaining borrowable amount is: 0USDT"}
                    '130101': BadRequest, // Parameter error
                    '130102': ExchangeError, // Maximum subscription amount has been exceeded.
                    '130103': OrderNotFound, // Subscription order does not exist.
                    '130104': ExchangeError, // Maximum number of subscription orders has been exceeded.
                    '130105': InsufficientFunds, // Insufficient balance.
                    '130106': NotSupported, // The currency does not support redemption.
                    '130107': ExchangeError, // Redemption amount exceeds subscription amount.
                    '130108': OrderNotFound, // Redemption order does not exist.
                    '130201': PermissionDenied, // Your account has restricted access to certain features. Please contact customer service for further assistance
                    '130202': ExchangeError, // The system is renewing the loan automatically. Please try again later
                    '130203': InsufficientFunds, // Insufficient account balance
                    '130204': BadRequest, // As the total lending amount for platform leverage reaches the platform's maximum position limit, the system suspends the borrowing function of leverage
                    '130301': InsufficientFunds, // Insufficient account balance
                    '130302': PermissionDenied, // Your relevant permission rights have been restricted, you can contact customer service for processing
                    '130303': NotSupported, // The current trading pair does not support isolated positions
                    '130304': NotSupported, // The trading function of the current trading pair is not enabled
                    '130305': NotSupported, // The current trading pair does not support cross position
                    '130306': NotSupported, // The account has not opened leveraged trading
                    '130307': NotSupported, // Please reopen the leverage agreement
                    '130308': InvalidOrder, // Position renewal freeze
                    '130309': InvalidOrder, // Position forced liquidation freeze
                    '130310': ExchangeError, // Abnormal leverage account status
                    '130311': InvalidOrder, // Failed to place an order, triggering buy limit
                    '130312': InvalidOrder, // Trigger global position limit, suspend buying
                    '130313': InvalidOrder, // Trigger global position limit, suspend selling
                    '130314': InvalidOrder, // Trigger the global position limit and prompt the remaining quantity available for purchase
                    '130315': NotSupported, // This feature has been suspended due to country restrictions
                    '126000': ExchangeError, // Abnormal margin trading
                    '126001': NotSupported, // Users currently do not support high frequency
                    '126002': ExchangeError, // There is a risk problem in your account and transactions are temporarily not allowed!
                    '126003': InvalidOrder, // The commission amount is less than the minimum transaction amount for a single commission
                    '126004': ExchangeError, // Trading pair does not exist or is prohibited
                    '126005': PermissionDenied, // This trading pair requires advanced KYC certification before trading
                    '126006': ExchangeError, // Trading pair is not available
                    '126007': ExchangeError, // Trading pair suspended
                    '126009': ExchangeError, // Trading pair is suspended from creating orders
                    '126010': ExchangeError, // Trading pair suspended order cancellation
                    '126011': ExchangeError, // There are too many orders in the order
                    '126013': InsufficientFunds, // Insufficient account balance
                    '126015': ExchangeError, // It is prohibited to place orders on this trading pair
                    '126021': NotSupported, // This digital asset does not support user participation in your region, thank you for your understanding!
                    '126022': InvalidOrder, // The final transaction price of your order will trigger the price protection strategy. To protect the price from deviating too much, please place an order again.
                    '126027': InvalidOrder, // Only limit orders are supported
                    '126028': InvalidOrder, // Only limit orders are supported before the specified time
                    '126029': InvalidOrder, // The maximum order price is: xxx
                    '126030': InvalidOrder, // The minimum order price is: xxx
                    '126033': InvalidOrder, // Duplicate order
                    '126034': InvalidOrder, // Failed to create take profit and stop loss order
                    '126036': InvalidOrder, // Failed to create margin order
                    '126037': ExchangeError, // Due to country and region restrictions, this function has been suspended!
                    '126038': ExchangeError, // Third-party service call failed (internal exception)
                    '126039': ExchangeError, // Third-party service call failed, reason: xxx
                    '126041': ExchangeError, // clientTimestamp parameter error
                    '126042': ExchangeError, // Exceeded maximum position limit
                    '126043': OrderNotFound, // Order does not exist
                    '126044': InvalidOrder, // clientOid duplicate
                    '126045': NotSupported, // This digital asset does not support user participation in your region, thank you for your understanding!
                    '126046': NotSupported, // This digital asset does not support your IP region, thank you for your understanding!
                    '126047': PermissionDenied, // Please complete identity verification
                    '126048': PermissionDenied, // Please complete authentication for the master account
                    '135005': ExchangeError, // Margin order query business abnormality
                    '135018': ExchangeError, // Margin order query service abnormality
                    '200004': InsufficientFunds,
                    '210014': InvalidOrder, // {"code":"210014","msg":"Exceeds the max. borrowing amount, the remaining amount you can borrow: 0USDT"}
                    '210021': InsufficientFunds, // {"code":"210021","msg":"Balance not enough"}
                    '230003': InsufficientFunds, // {"code":"230003","msg":"Balance insufficient!"}
                    '260000': InvalidAddress, // {"code":"260000","msg":"Deposit address already exists."}
                    '260100': InsufficientFunds, // {"code":"260100","msg":"account.noBalance"}
                    '300000': InvalidOrder,
                    '400000': BadSymbol,
                    '400001': AuthenticationError,
                    '400002': InvalidNonce,
                    '400003': AuthenticationError,
                    '400004': AuthenticationError,
                    '400005': AuthenticationError,
                    '400006': AuthenticationError,
                    '400007': AuthenticationError,
                    '400008': NotSupported,
                    '400100': InsufficientFunds, // {"msg":"account.available.amount","code":"400100"} or {"msg":"Withdrawal amount is below the minimum requirement.","code":"400100"}
                    '400200': InvalidOrder, // {"code":"400200","msg":"Forbidden to place an order"}
                    '400350': InvalidOrder, // {"code":"400350","msg":"Upper limit for holding: 10,000USDT, you can still buy 10,000USDT worth of coin."}
                    '400370': InvalidOrder, // {"code":"400370","msg":"Max. price: 0.02500000000000000000"}
                    '400400': BadRequest, // Parameter error
                    '400401': AuthenticationError, // User is not logged in
                    '400500': InvalidOrder, // {"code":"400500","msg":"Your located country/region is currently not supported for the trading of this token"}
                    '400600': BadSymbol, // {"code":"400600","msg":"validation.createOrder.symbolNotAvailable"}
                    '400760': InvalidOrder, // {"code":"400760","msg":"order price should be more than XX"}
                    '401000': BadRequest, // {"code":"401000","msg":"The interface has been deprecated"}
                    '408000': BadRequest, // Network timeout, please try again later
                    '411100': AccountSuspended,
                    '415000': BadRequest, // {"code":"415000","msg":"Unsupported Media Type"}
                    '400303': PermissionDenied, // {"msg":"To enjoy the full range of our products and services, we kindly request you complete the identity verification process.","code":"400303"}
                    '500000': ExchangeNotAvailable, // {"code":"500000","msg":"Internal Server Error"}
                    '260220': InvalidAddress, // { "code": "260220", "msg": "deposit.address.not.exists" }
                    '900014': BadRequest, // {"code":"900014","msg":"Invalid chainId"}
                },
                'broad': {
                    'Exceeded the access frequency': RateLimitExceeded,
                    'require more permission': PermissionDenied,
                },
            },
            'fees': {
                'trading': {
                    'tierBased': true,
                    'percentage': true,
                    'taker': this.parseNumber ('0.001'),
                    'maker': this.parseNumber ('0.001'),
                    'tiers': {
                        'taker': [
                            [ this.parseNumber ('0'), this.parseNumber ('0.001') ],
                            [ this.parseNumber ('50'), this.parseNumber ('0.001') ],
                            [ this.parseNumber ('200'), this.parseNumber ('0.0009') ],
                            [ this.parseNumber ('500'), this.parseNumber ('0.0008') ],
                            [ this.parseNumber ('1000'), this.parseNumber ('0.0007') ],
                            [ this.parseNumber ('2000'), this.parseNumber ('0.0007') ],
                            [ this.parseNumber ('4000'), this.parseNumber ('0.0006') ],
                            [ this.parseNumber ('8000'), this.parseNumber ('0.0005') ],
                            [ this.parseNumber ('15000'), this.parseNumber ('0.00045') ],
                            [ this.parseNumber ('25000'), this.parseNumber ('0.0004') ],
                            [ this.parseNumber ('40000'), this.parseNumber ('0.00035') ],
                            [ this.parseNumber ('60000'), this.parseNumber ('0.0003') ],
                            [ this.parseNumber ('80000'), this.parseNumber ('0.00025') ],
                        ],
                        'maker': [
                            [ this.parseNumber ('0'), this.parseNumber ('0.001') ],
                            [ this.parseNumber ('50'), this.parseNumber ('0.0009') ],
                            [ this.parseNumber ('200'), this.parseNumber ('0.0007') ],
                            [ this.parseNumber ('500'), this.parseNumber ('0.0005') ],
                            [ this.parseNumber ('1000'), this.parseNumber ('0.0003') ],
                            [ this.parseNumber ('2000'), this.parseNumber ('0') ],
                            [ this.parseNumber ('4000'), this.parseNumber ('0') ],
                            [ this.parseNumber ('8000'), this.parseNumber ('0') ],
                            [ this.parseNumber ('15000'), this.parseNumber ('-0.00005') ],
                            [ this.parseNumber ('25000'), this.parseNumber ('-0.00005') ],
                            [ this.parseNumber ('40000'), this.parseNumber ('-0.00005') ],
                            [ this.parseNumber ('60000'), this.parseNumber ('-0.00005') ],
                            [ this.parseNumber ('80000'), this.parseNumber ('-0.00005') ],
                        ],
                    },
                },
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {},
                    'deposit': {},
                },
            },
            'commonCurrencies': {
                'BIFI': 'BIFIF',
                'VAI': 'VAIOT',
                'WAX': 'WAXP',
                'ALT': 'APTOSLAUNCHTOKEN',
                'KALT': 'ALT', // ALTLAYER
            },
            'options': {
                'version': 'v1',
                'symbolSeparator': '-',
                'fetchMyTradesMethod': 'private_get_fills',
                'fetchCurrencies': {
                    'webApiEnable': true, // fetches from WEB
                    'webApiRetries': 1,
                    'webApiMuteFailure': true,
                },
                'fetchMarkets': {
                    'fetchTickersFees': true,
                },
                'withdraw': {
                    'includeFee': false,
                },
                // endpoint versions
                'versions': {
                    'public': {
                        'GET': {
                            // spot trading
                            'currencies': 'v3',
                            'currencies/{currency}': 'v3',
                            'symbols': 'v2',
                            'mark-price/all-symbols': 'v3',
                        },
                    },
                    'private': {
                        'GET': {
                            // account
                            'user-info': 'v2',
                            'hf/margin/account/ledgers': 'v3',
                            'sub/user': 'v2',
                            'sub-accounts': 'v2',
                            // funding
                            'margin/accounts': 'v3',
                            'isolated/accounts': 'v3',
                            // 'deposit-addresses': 'v2',
                            'deposit-addresses': 'v1', // 'v1' for fetchDepositAddress, 'v2' for fetchDepositAddressesByNetwork
                            // spot trading
                            'market/orderbook/level2': 'v3',
                            'market/orderbook/level3': 'v3',
                            'market/orderbook/level{level}': 'v3',
                            'oco/order/{orderId}': 'v3',
                            'oco/order/details/{orderId}': 'v3',
                            'oco/client-order/{clientOid}': 'v3',
                            'oco/orders': 'v3',
                            // margin trading
                            'hf/margin/orders/active': 'v3',
                            'hf/margin/order/active/symbols': 'v3',
                            'hf/margin/orders/done': 'v3',
                            'hf/margin/orders/{orderId}': 'v3',
                            'hf/margin/orders/client-order/{clientOid}': 'v3',
                            'hf/margin/fills': 'v3',
                            'etf/info': 'v3',
                            'margin/currencies': 'v3',
                            'margin/borrow': 'v3',
                            'margin/repay': 'v3',
                            'margin/interest': 'v3',
                            'project/list': 'v3',
                            'project/marketInterestRate': 'v3',
                            'redeem/orders': 'v3',
                            'purchase/orders': 'v3',
                            'migrate/user/account/status': 'v3',
                            'margin/symbols': 'v3',
                            'affiliate/inviter/statistics': 'v2',
                            'asset/ndbroker/deposit/list': 'v1',
                        },
                        'POST': {
                            // account
                            'sub/user/created': 'v2',
                            // funding
                            'accounts/universal-transfer': 'v3',
                            'accounts/sub-transfer': 'v2',
                            'accounts/inner-transfer': 'v2',
                            'transfer-out': 'v3',
                            // spot trading
                            'oco/order': 'v3',
                            // margin trading
                            'hf/margin/order': 'v3',
                            'hf/margin/order/test': 'v3',
                            'margin/borrow': 'v3',
                            'margin/repay': 'v3',
                            'purchase': 'v3',
                            'redeem': 'v3',
                            'lend/purchase/update': 'v3',
                            'position/update-user-leverage': 'v3',
                        },
                        'DELETE': {
                            // account
                            // funding
                            // spot trading
                            'hf/margin/orders/{orderId}': 'v3',
                            'hf/margin/orders/client-order/{clientOid}': 'v3',
                            'hf/margin/orders': 'v3',
                            'oco/order/{orderId}': 'v3',
                            'oco/client-order/{clientOid}': 'v3',
                            'oco/orders': 'v3',
                            // margin trading
                        },
                    },
                    'futuresPrivate': {
                        'POST': {
                            'transfer-out': 'v3',
                        },
                    },
                },
                'partner': {
                    // the support for spot and future exchanges as separate settings
                    'spot': {
                        'id': 'ccxt',
                        'key': '9e58cc35-5b5e-4133-92ec-166e3f077cb8',
                    },
                    'future': {
                        'id': 'ccxtfutures',
                        'key': '1b327198-f30c-4f14-a0ac-918871282f15',
                    },
                    // exchange-wide settings are also supported
                    // 'id': 'ccxt'
                    // 'key': '9e58cc35-5b5e-4133-92ec-166e3f077cb8',
                },
                'accountsByType': {
                    'spot': 'trade',
                    'margin': 'margin',
                    'cross': 'margin',
                    'isolated': 'isolated',
                    'main': 'main',
                    'funding': 'main',
                    'future': 'contract',
                    'swap': 'contract',
                    'mining': 'pool',
                    'hf': 'trade_hf',
                },
                'networks': {
                    'BTC': 'btc',
                    'BTCNATIVESEGWIT': 'bech32',
                    'ERC20': 'eth',
                    'TRC20': 'trx',
                    'HRC20': 'heco',
                    'MATIC': 'matic',
                    'KCC': 'kcc', // kucoin community chain
                    'SOL': 'sol',
                    'ALGO': 'algo',
                    'EOS': 'eos',
                    'BEP20': 'bsc',
                    'BEP2': 'bnb',
                    'ARBONE': 'arbitrum',
                    'AVAXX': 'avax',
                    'AVAXC': 'avaxc',
                    'TLOS': 'tlos', // tlosevm is different
                    'CFX': 'cfx',
                    'ACA': 'aca',
                    'OPTIMISM': 'optimism',
                    'ONT': 'ont',
                    'GLMR': 'glmr',
                    'CSPR': 'cspr',
                    'KLAY': 'klay',
                    'XRD': 'xrd',
                    'RVN': 'rvn',
                    'NEAR': 'near',
                    'APT': 'aptos',
                    'ETHW': 'ethw',
                    'TON': 'ton',
                    'BCH': 'bch',
                    'BSV': 'bchsv',
                    'BCHA': 'bchabc',
                    'OSMO': 'osmo',
                    'NANO': 'nano',
                    'XLM': 'xlm',
                    'VET': 'vet',
                    'IOST': 'iost',
                    'ZIL': 'zil',
                    'XRP': 'xrp',
                    'TOMO': 'tomo',
                    'XMR': 'xmr',
                    'COTI': 'coti',
                    'XTZ': 'xtz',
                    'ADA': 'ada',
                    'WAX': 'waxp',
                    'THETA': 'theta',
                    'ONE': 'one',
                    'IOTEX': 'iotx',
                    'NULS': 'nuls',
                    'KSM': 'ksm',
                    'LTC': 'ltc',
                    'WAVES': 'waves',
                    'DOT': 'dot',
                    'STEEM': 'steem',
                    'QTUM': 'qtum',
                    'DOGE': 'doge',
                    'FIL': 'fil',
                    'XYM': 'xym',
                    'FLUX': 'flux',
                    'ATOM': 'atom',
                    'XDC': 'xdc',
                    'KDA': 'kda',
                    'ICP': 'icp',
                    'CELO': 'celo',
                    'LSK': 'lsk',
                    'VSYS': 'vsys',
                    'KAR': 'kar',
                    'XCH': 'xch',
                    'FLOW': 'flow',
                    'BAND': 'band',
                    'EGLD': 'egld',
                    'HBAR': 'hbar',
                    'XPR': 'xpr',
                    'AR': 'ar',
                    'FTM': 'ftm',
                    'KAVA': 'kava',
                    'KMA': 'kma',
                    'XEC': 'xec',
                    'IOTA': 'iota',
                    'HNT': 'hnt',
                    'ASTR': 'astr',
                    'PDEX': 'pdex',
                    'METIS': 'metis',
                    'ZEC': 'zec',
                    'POKT': 'pokt',
                    'OASYS': 'oas',
                    'OASIS': 'oasis', // a.k.a. ROSE
                    'ETC': 'etc',
                    'AKT': 'akt',
                    'FSN': 'fsn',
                    'SCRT': 'scrt',
                    'CFG': 'cfg',
                    'ICX': 'icx',
                    'KMD': 'kmd',
                    'NEM': 'NEM',
                    'STX': 'stx',
                    'DGB': 'dgb',
                    'DCR': 'dcr',
                    'CKB': 'ckb', // ckb2 is just odd entry
                    'ELA': 'ela', // esc might be another chain elastos smart chain
                    'HYDRA': 'hydra',
                    'BTM': 'btm',
                    'KARDIA': 'kai',
                    'SXP': 'sxp', // a.k.a. solar swipe
                    'NEBL': 'nebl',
                    'ZEN': 'zen',
                    'SDN': 'sdn',
                    'LTO': 'lto',
                    'WEMIX': 'wemix',
                    // 'BOBA': 'boba', // tbd
                    'EVER': 'ever',
                    'BNC': 'bnc',
                    'BNCDOT': 'bncdot',
                    // 'CMP': 'cmp', // todo: after consensus
                    'AION': 'aion',
                    'GRIN': 'grin',
                    'LOKI': 'loki',
                    'QKC': 'qkc',
                    'TT': 'TT',
                    'PIVX': 'pivx',
                    'SERO': 'sero',
                    'METER': 'meter',
                    'STATEMINE': 'statemine', // a.k.a. RMRK
                    'DVPN': 'dvpn',
                    'XPRT': 'xprt',
                    'MOVR': 'movr',
                    'ERGO': 'ergo',
                    'ABBC': 'abbc',
                    'DIVI': 'divi',
                    'PURA': 'pura',
                    'DFI': 'dfi',
                    // 'NEO': 'neo', // tbd neo legacy
                    'NEON3': 'neon3',
                    'DOCK': 'dock',
                    'TRUE': 'true',
                    'CS': 'cs',
                    'ORAI': 'orai',
                    // below will be uncommented after consensus
                    // 'BITCOINDIAMON': 'bcd',
                    // 'BITCOINGOLD': 'btg',
                    // 'HTR': 'htr',
                    // 'DEROHE': 'derohe',
                    // 'NDAU': 'ndau',
                    // 'HPB': 'hpb',
                    // 'AXE': 'axe',
                    // 'BITCOINPRIVATE': 'btcp',
                    // 'EDGEWARE': 'edg',
                    // 'JUPITER': 'jup',
                    // 'VELAS': 'vlx', // vlxevm is different
                    // // 'terra' luna lunc TBD
                    // 'DIGITALBITS': 'xdb',
                    // // fra is fra-emv on kucoin
                    // 'PASTEL': 'psl',
                    // // sysevm
                    // 'CONCORDIUM': 'ccd',
                    // 'AURORA': 'aurora',
                    // 'PHA': 'pha', // a.k.a. khala
                    // 'PAL': 'pal',
                    // 'RSK': 'rbtc',
                    // 'NIX': 'nix',
                    // 'NIM': 'nim',
                    // 'NRG': 'nrg',
                    // 'RFOX': 'rfox',
                    // 'PIONEER': 'neer',
                    // 'PIXIE': 'pix',
                    // 'ALEPHZERO': 'azero',
                    // 'ACHAIN': 'act', // actevm is different
                    // 'BOSCOIN': 'bos',
                    // 'ELECTRONEUM': 'etn',
                    // 'GOCHAIN': 'go',
                    // 'SOPHIATX': 'sphtx',
                    // 'WANCHAIN': 'wan',
                    // 'ZEEPIN': 'zpt',
                    // 'MATRIXAI': 'man',
                    // 'METADIUM': 'meta',
                    // 'METAHASH': 'mhc',
                    // // eosc --"eosforce" tbd
                    // 'IOTCHAIN': 'itc',
                    // 'CONTENTOS': 'cos',
                    // 'CPCHAIN': 'cpc',
                    // 'INTCHAIN': 'int',
                    // // 'DASH': 'dash', tbd digita-cash
                    // 'WALTONCHAIN': 'wtc',
                    // 'CONSTELLATION': 'dag',
                    // 'ONELEDGER': 'olt',
                    // 'AIRDAO': 'amb', // a.k.a. AMBROSUS
                    // 'ENERGYWEB': 'ewt',
                    // 'WAVESENTERPRISE': 'west',
                    // 'HYPERCASH': 'hc',
                    // 'ENECUUM': 'enq',
                    // 'HAVEN': 'xhv',
                    // 'CHAINX': 'pcx',
                    // // 'FLUXOLD': 'zel', // zel seems old chain (with uppercase FLUX in kucoin UI and with id 'zel')
                    // 'BUMO': 'bu',
                    // 'DEEPONION': 'onion',
                    // 'ULORD': 'ut',
                    // 'ASCH': 'xas',
                    // 'SOLARIS': 'xlr',
                    // 'APOLLO': 'apl',
                    // 'PIRATECHAIN': 'arrr',
                    // 'ULTRA': 'uos',
                    // 'EMONEY': 'ngm',
                    // 'AURORACHAIN': 'aoa',
                    // 'KLEVER': 'klv',
                    // undetermined: xns(insolar), rhoc, luk (luniverse), kts (klimatas), bchn (bitcoin cash node), god (shallow entry), lit (litmus),
                },
                'marginModes': {
                    'cross': 'MARGIN_TRADE',
                    'isolated': 'MARGIN_ISOLATED_TRADE',
                    'spot': 'TRADE',
                },
            },
        });
    }

    nonce () {
        return this.milliseconds ();
    }

    async fetchTime (params = {}) {
        /**
         * @method
         * @name kucoin#fetchTime
         * @description fetches the current integer timestamp in milliseconds from the exchange server
         * @see https://docs.kucoin.com/#server-time
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {int} the current integer timestamp in milliseconds from the exchange server
         */
        const response = await this.publicGetTimestamp (params);
        //
        //     {
        //         "code":"200000",
        //         "msg":"success",
        //         "data":1546837113087
        //     }
        //
        return this.safeInteger (response, 'data');
    }

    async fetchStatus (params = {}) {
        /**
         * @method
         * @name kucoin#fetchStatus
         * @description the latest known information on the availability of the exchange API
         * @see https://docs.kucoin.com/#service-status
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a [status structure]{@link https://docs.ccxt.com/#/?id=exchange-status-structure}
         */
        const response = await this.publicGetStatus (params);
        //
        //     {
        //         "code":"200000",
        //         "data":{
        //             "status":"open", //open, close, cancelonly
        //             "msg":"upgrade match engine" //remark for operation
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        const status = this.safeString (data, 'status');
        return {
            'status': (status === 'open') ? 'ok' : 'maintenance',
            'updated': undefined,
            'eta': undefined,
            'url': undefined,
            'info': response,
        };
    }

    async fetchMarkets (params = {}): Promise<Market[]> {
        /**
         * @method
         * @name kucoin#fetchMarkets
         * @description retrieves data on all markets for kucoin
         * @see https://docs.kucoin.com/#get-symbols-list-deprecated
         * @see https://docs.kucoin.com/#get-all-tickers
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object[]} an array of objects representing market data
         */
        let fetchTickersFees = undefined;
        [ fetchTickersFees, params ] = this.handleOptionAndParams (params, 'fetchMarkets', 'fetchTickersFees', true);
        const promises = [];
        promises.push (this.publicGetSymbols (params));
        //
        //     {
        //         "code": "200000",
        //         "data": [
        //             {
        //                 "symbol": "XLM-USDT",
        //                 "name": "XLM-USDT",
        //                 "baseCurrency": "XLM",
        //                 "quoteCurrency": "USDT",
        //                 "feeCurrency": "USDT",
        //                 "market": "USDS",
        //                 "baseMinSize": "0.1",
        //                 "quoteMinSize": "0.01",
        //                 "baseMaxSize": "10000000000",
        //                 "quoteMaxSize": "99999999",
        //                 "baseIncrement": "0.0001",
        //                 "quoteIncrement": "0.000001",
        //                 "priceIncrement": "0.000001",
        //                 "priceLimitRate": "0.1",
        //                 "isMarginEnabled": true,
        //                 "enableTrading": true
        //             },
        //
        const requestMarginables = this.checkRequiredCredentials (false);
        if (requestMarginables) {
            promises.push (this.privateGetMarginSymbols (params)); // cross margin symbols
            //
            //    {
            //        "code": "200000",
            //        "data": {
            //            "timestamp": 1719393213421,
            //            "items": [
            //                {
            //                    // same object as in market, with one additional field:
            //                    "minFunds": "0.1"
            //                },
            //
            promises.push (this.privateGetIsolatedSymbols (params)); // isolated margin symbols
            //
            //    {
            //        "code": "200000",
            //        "data": [
            //            {
            //                "symbol": "NKN-USDT",
            //                "symbolName": "NKN-USDT",
            //                "baseCurrency": "NKN",
            //                "quoteCurrency": "USDT",
            //                "maxLeverage": 5,
            //                "flDebtRatio": "0.97",
            //                "tradeEnable": true,
            //                "autoRenewMaxDebtRatio": "0.96",
            //                "baseBorrowEnable": true,
            //                "quoteBorrowEnable": true,
            //                "baseTransferInEnable": true,
            //                "quoteTransferInEnable": true,
            //                "baseBorrowCoefficient": "1",
            //                "quoteBorrowCoefficient": "1"
            //            },
            //
        }
        if (fetchTickersFees) {
            promises.push (this.publicGetMarketAllTickers (params));
            //
            //     {
            //         "code": "200000",
            //         "data": {
            //             "time":1602832092060,
            //             "ticker":[
            //                 {
            //                     "symbol": "BTC-USDT",   // symbol
            //                     "symbolName":"BTC-USDT", // Name of trading pairs, it would change after renaming
            //                     "buy": "11328.9",   // bestAsk
            //                     "sell": "11329",    // bestBid
            //                     "changeRate": "-0.0055",    // 24h change rate
            //                     "changePrice": "-63.6", // 24h change price
            //                     "high": "11610",    // 24h highest price
            //                     "low": "11200", // 24h lowest price
            //                     "vol": "2282.70993217", // 24h volume，the aggregated trading volume in BTC
            //                     "volValue": "25984946.157790431",   // 24h total, the trading volume in quote currency of last 24 hours
            //                     "last": "11328.9",  // last price
            //                     "averagePrice": "11360.66065903",   // 24h average transaction price yesterday
            //                     "takerFeeRate": "0.001",    // Basic Taker Fee
            //                     "makerFeeRate": "0.001",    // Basic Maker Fee
            //                     "takerCoefficient": "1",    // Taker Fee Coefficient
            //                     "makerCoefficient": "1" // Maker Fee Coefficient
            //                 }
            //
        }
        const responses = await Promise.all (promises);
        const symbolsData = this.safeList (responses[0], 'data');
        const crossData = requestMarginables ? this.safeDict (responses[1], 'data', {}) : {};
        const crossItems = this.safeList (crossData, 'items', []);
        const crossById = this.indexBy (crossItems, 'symbol');
        const isolatedData = requestMarginables ? responses[2] : {};
        const isolatedItems = this.safeList (isolatedData, 'data', []);
        const isolatedById = this.indexBy (isolatedItems, 'symbol');
        const tickersIdx = requestMarginables ? 3 : 1;
        const tickersResponse = this.safeDict (responses, tickersIdx, {});
        const tickerItems = this.safeList (this.safeDict (tickersResponse, 'data', {}), 'ticker', []);
        const tickersById = this.indexBy (tickerItems, 'symbol');
        const result = [];
        for (let i = 0; i < symbolsData.length; i++) {
            const market = symbolsData[i];
            const id = this.safeString (market, 'symbol');
            const [ baseId, quoteId ] = id.split ('-');
            const base = this.safeCurrencyCode (baseId);
            const quote = this.safeCurrencyCode (quoteId);
            // const quoteIncrement = this.safeNumber (market, 'quoteIncrement');
            const ticker = this.safeDict (tickersById, id, {});
            const makerFeeRate = this.safeString (ticker, 'makerFeeRate');
            const takerFeeRate = this.safeString (ticker, 'takerFeeRate');
            const makerCoefficient = this.safeString (ticker, 'makerCoefficient');
            const takerCoefficient = this.safeString (ticker, 'takerCoefficient');
            const hasCrossMargin = (id in crossById);
            const hasIsolatedMargin = (id in isolatedById);
            const isMarginable = this.safeBool (market, 'isMarginEnabled', false) || hasCrossMargin || hasIsolatedMargin;
            result.push ({
                'id': id,
                'symbol': base + '/' + quote,
                'base': base,
                'quote': quote,
                'settle': undefined,
                'baseId': baseId,
                'quoteId': quoteId,
                'settleId': undefined,
                'type': 'spot',
                'spot': true,
                'margin': isMarginable,
                'marginMode': {
                    'cross': hasCrossMargin,
                    'isolated': hasIsolatedMargin,
                },
                'swap': false,
                'future': false,
                'option': false,
                'active': this.safeBool (market, 'enableTrading'),
                'contract': false,
                'linear': undefined,
                'inverse': undefined,
                'taker': this.parseNumber (Precise.stringMul (takerFeeRate, takerCoefficient)),
                'maker': this.parseNumber (Precise.stringMul (makerFeeRate, makerCoefficient)),
                'contractSize': undefined,
                'expiry': undefined,
                'expiryDatetime': undefined,
                'strike': undefined,
                'optionType': undefined,
                'precision': {
                    'amount': this.safeNumber (market, 'baseIncrement'),
                    'price': this.safeNumber (market, 'priceIncrement'),
                },
                'limits': {
                    'leverage': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'amount': {
                        'min': this.safeNumber (market, 'baseMinSize'),
                        'max': this.safeNumber (market, 'baseMaxSize'),
                    },
                    'price': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'cost': {
                        'min': this.safeNumber (market, 'quoteMinSize'),
                        'max': this.safeNumber (market, 'quoteMaxSize'),
                    },
                },
                'created': undefined,
                'info': market,
            });
        }
        return result;
    }

    async loadMigrationStatus (force: boolean = false) {
        if (!('hfMigrated' in this.options) || force) {
            const result: Dict = await this.privateGetMigrateUserAccountStatus ();
            const data: Dict = this.safeDict (result, 'data', {});
            const status: Int = this.safeInteger (data, 'status');
            this.options['hfMigrated'] = (status === 2);
        }
    }

    async handleHfAndParams (params = {}) {
        await this.loadMigrationStatus ();
        const migrated: Bool = this.safeBool (this.options, 'hfMigrated');
        let loadedHf: Bool = undefined;
        if (migrated !== undefined) {
            if (migrated) {
                loadedHf = true;
            } else {
                loadedHf = false;
            }
        }
        const hf: Bool = this.safeBool (params, 'hf', loadedHf);
        params = this.omit (params, 'hf');
        return [ hf, params ];
    }

    async fetchCurrencies (params = {}): Promise<Currencies> {
        /**
         * @method
         * @name kucoin#fetchCurrencies
         * @description fetches all available currencies on an exchange
         * @see https://docs.kucoin.com/#get-currencies
         * @param {object} params extra parameters specific to the exchange API endpoint
         * @returns {object} an associative dictionary of currencies
         */
        const promises = [];
        promises.push (this.publicGetCurrencies (params));
        //
        //    {
        //        "code":"200000",
        //        "data":[
        //           {
        //              "currency":"CSP",
        //              "name":"CSP",
        //              "fullName":"Caspian",
        //              "precision":8,
        //              "confirms":null,
        //              "contractAddress":null,
        //              "isMarginEnabled":false,
        //              "isDebitEnabled":false,
        //              "chains":[
        //                 {
        //                    "chainName":"ERC20",
        //                    "chainId": "eth"
        //                    "withdrawalMinSize":"2999",
        //                    "depositMinSize":null,
        //                    "withdrawFeeRate":"0",
        //                    "withdrawalMinFee":"2999",
        //                    "isWithdrawEnabled":false,
        //                    "isDepositEnabled":false,
        //                    "confirms":12,
        //                    "preConfirms":12,
        //                    "contractAddress":"0xa6446d655a0c34bc4f05042ee88170d056cbaf45",
        //                    "depositFeeRate": "0.001", // present for some currencies/networks
        //                 }
        //              ]
        //           },
        //    }
        //
        promises.push (this.fetchWebEndpoint ('fetchCurrencies', 'webExchangeGetCurrencyCurrencyChainInfo', true));
        //
        //    {
        //        "success": true,
        //        "code": "200",
        //        "msg": "success",
        //        "retry": false,
        //        "data": [
        //            {
        //                "status": "enabled",
        //                "currency": "BTC",
        //                "isChainEnabled": "true",
        //                "chain": "btc",
        //                "chainName": "BTC",
        //                "chainFullName": "Bitcoin",
        //                "walletPrecision": "8",
        //                "isDepositEnabled": "true",
        //                "depositMinSize": "0.00005",
        //                "confirmationCount": "2",
        //                "isWithdrawEnabled": "true",
        //                "withdrawMinSize": "0.001",
        //                "withdrawMinFee": "0.0005",
        //                "withdrawFeeRate": "0",
        //                "depositDisabledTip": "Wallet Maintenance",
        //                "preDepositTipEnabled": "true",
        //                "preDepositTip": "Do not transfer from ETH network directly",
        //                "withdrawDisabledTip": "",
        //                "preWithdrawTipEnabled": "false",
        //                "preWithdrawTip": "",
        //                "orgAddress": "",
        //                "userAddressName": "Memo",
        //            },
        //        ]
        //    }
        //
        const responses = await Promise.all (promises);
        const currenciesResponse = this.safeDict (responses, 0, {});
        const currenciesData = this.safeList (currenciesResponse, 'data', []);
        const additionalResponse = this.safeDict (responses, 1, {});
        const additionalData = this.safeList (additionalResponse, 'data', []);
        const additionalDataGrouped = this.groupBy (additionalData, 'currency');
        const result: Dict = {};
        for (let i = 0; i < currenciesData.length; i++) {
            const entry = currenciesData[i];
            const id = this.safeString (entry, 'currency');
            const name = this.safeString (entry, 'fullName');
            const code = this.safeCurrencyCode (id);
            let isWithdrawEnabled = undefined;
            let isDepositEnabled = undefined;
            const networks: Dict = {};
            const chains = this.safeList (entry, 'chains', []);
            const extraChainsData = this.indexBy (this.safeList (additionalDataGrouped, id, []), 'chain');
            const rawPrecision = this.safeString (entry, 'precision');
            const precision = this.parseNumber (this.parsePrecision (rawPrecision));
            const chainsLength = chains.length;
            if (!chainsLength) {
                // https://t.me/KuCoin_API/173118
                isWithdrawEnabled = false;
                isDepositEnabled = false;
            }
            for (let j = 0; j < chainsLength; j++) {
                const chain = chains[j];
                const chainId = this.safeString (chain, 'chainId');
                const networkCode = this.networkIdToCode (chainId);
                const chainWithdrawEnabled = this.safeBool (chain, 'isWithdrawEnabled', false);
                if (isWithdrawEnabled === undefined) {
                    isWithdrawEnabled = chainWithdrawEnabled;
                } else {
                    isWithdrawEnabled = isWithdrawEnabled || chainWithdrawEnabled;
                }
                const chainDepositEnabled = this.safeBool (chain, 'isDepositEnabled', false);
                if (isDepositEnabled === undefined) {
                    isDepositEnabled = chainDepositEnabled;
                } else {
                    isDepositEnabled = isDepositEnabled || chainDepositEnabled;
                }
                const chainExtraData = this.safeDict (extraChainsData, chainId, {});
                networks[networkCode] = {
                    'info': chain,
                    'id': chainId,
                    'name': this.safeString (chain, 'chainName'),
                    'code': networkCode,
                    'active': chainWithdrawEnabled && chainDepositEnabled,
                    'fee': this.safeNumber (chain, 'withdrawalMinFee'),
                    'deposit': chainDepositEnabled,
                    'withdraw': chainWithdrawEnabled,
                    'precision': this.parseNumber (this.parsePrecision (this.safeString (chainExtraData, 'walletPrecision'))),
                    'limits': {
                        'withdraw': {
                            'min': this.safeNumber (chain, 'withdrawalMinSize'),
                            'max': undefined,
                        },
                        'deposit': {
                            'min': this.safeNumber (chain, 'depositMinSize'),
                            'max': undefined,
                        },
                    },
                };
            }
            // kucoin has determined 'fiat' currencies with below logic
            const isFiat = (rawPrecision === '2') && (chainsLength === 0);
            result[code] = {
                'id': id,
                'name': name,
                'code': code,
                'type': isFiat ? 'fiat' : 'crypto',
                'precision': precision,
                'info': entry,
                'active': (isDepositEnabled || isWithdrawEnabled),
                'deposit': isDepositEnabled,
                'withdraw': isWithdrawEnabled,
                'fee': undefined,
                'limits': this.limits,
                'networks': networks,
            };
        }
        return result;
    }

    async fetchAccounts (params = {}): Promise<Account[]> {
        /**
         * @method
         * @name kucoin#fetchAccounts
         * @description fetch all the accounts associated with a profile
         * @see https://docs.kucoin.com/#list-accounts
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a dictionary of [account structures]{@link https://docs.ccxt.com/#/?id=account-structure} indexed by the account type
         */
        const response = await this.privateGetAccounts (params);
        //
        //     {
        //         "code": "200000",
        //         "data": [
        //             {
        //                 "balance": "0.00009788",
        //                 "available": "0.00009788",
        //                 "holds": "0",
        //                 "currency": "BTC",
        //                 "id": "5c6a4fd399a1d81c4f9cc4d0",
        //                 "type": "trade"
        //             },
        //             {
        //                 "balance": "0.00000001",
        //                 "available": "0.00000001",
        //                 "holds": "0",
        //                 "currency": "ETH",
        //                 "id": "5c6a49ec99a1d819392e8e9f",
        //                 "type": "trade"
        //             }
        //         ]
        //     }
        //
        const data = this.safeList (response, 'data', []);
        const result = [];
        for (let i = 0; i < data.length; i++) {
            const account = data[i];
            const accountId = this.safeString (account, 'id');
            const currencyId = this.safeString (account, 'currency');
            const code = this.safeCurrencyCode (currencyId);
            const type = this.safeString (account, 'type');  // main or trade
            result.push ({
                'id': accountId,
                'type': type,
                'currency': code,
                'code': code,
                'info': account,
            });
        }
        return result;
    }

    async fetchTransactionFee (code: string, params = {}) {
        /**
         * @method
         * @name kucoin#fetchTransactionFee
         * @description *DEPRECATED* please use fetchDepositWithdrawFee instead
         * @see https://docs.kucoin.com/#get-withdrawal-quotas
         * @param {string} code unified currency code
         * @param {object} params extra parameters specific to the exchange API endpoint
         * @returns {object} a [fee structure]{@link https://docs.ccxt.com/#/?id=fee-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
        };
        let networkCode = undefined;
        [ networkCode, params ] = this.handleNetworkCodeAndParams (params);
        if (networkCode !== undefined) {
            request['chain'] = this.networkCodeToId (networkCode).toLowerCase ();
        }
        const response = await this.privateGetWithdrawalsQuotas (this.extend (request, params));
        const data = this.safeDict (response, 'data', {});
        const withdrawFees: Dict = {};
        withdrawFees[code] = this.safeNumber (data, 'withdrawMinFee');
        return {
            'info': response,
            'withdraw': withdrawFees,
            'deposit': {},
        };
    }

    async fetchDepositWithdrawFee (code: string, params = {}) {
        /**
         * @method
         * @name kucoin#fetchDepositWithdrawFee
         * @description fetch the fee for deposits and withdrawals
         * @see https://docs.kucoin.com/#get-withdrawal-quotas
         * @param {string} code unified currency code
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {string} [params.network] The chain of currency. This only apply for multi-chain currency, and there is no need for single chain currency; you can query the chain through the response of the GET /api/v2/currencies/{currency} interface
         * @returns {object} a [fee structure]{@link https://docs.ccxt.com/#/?id=fee-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
        };
        let networkCode = undefined;
        [ networkCode, params ] = this.handleNetworkCodeAndParams (params);
        if (networkCode !== undefined) {
            request['chain'] = this.networkCodeToId (networkCode).toLowerCase ();
        }
        const response = await this.privateGetWithdrawalsQuotas (this.extend (request, params));
        //
        //    {
        //        "code": "200000",
        //        "data": {
        //            "currency": "USDT",
        //            "limitBTCAmount": "1.00000000",
        //            "usedBTCAmount": "0.00000000",
        //            "remainAmount": "16548.072149",
        //            "availableAmount": "0",
        //            "withdrawMinFee": "25",
        //            "innerWithdrawMinFee": "0",
        //            "withdrawMinSize": "50",
        //            "isWithdrawEnabled": true,
        //            "precision": 6,
        //            "chain": "ERC20"
        //        }
        //    }
        //
        const data = this.safeDict (response, 'data');
        return this.parseDepositWithdrawFee (data, currency) as any;
    }

    parseDepositWithdrawFee (fee, currency: Currency = undefined) {
        //
        //    {
        //        "currency": "USDT",
        //        "limitBTCAmount": "1.00000000",
        //        "usedBTCAmount": "0.00000000",
        //        "remainAmount": "16548.072149",
        //        "availableAmount": "0",
        //        "withdrawMinFee": "25",
        //        "innerWithdrawMinFee": "0",
        //        "withdrawMinSize": "50",
        //        "isWithdrawEnabled": true,
        //        "precision": 6,
        //        "chain": "ERC20"
        //    }
        //
        const result: Dict = {
            'info': fee,
            'withdraw': {
                'fee': undefined,
                'percentage': undefined,
            },
            'deposit': {
                'fee': undefined,
                'percentage': undefined,
            },
            'networks': {},
        };
        const isWithdrawEnabled = this.safeBool (fee, 'isWithdrawEnabled', true);
        let minFee = undefined;
        if (isWithdrawEnabled) {
            result['withdraw']['percentage'] = false;
            const chains = this.safeList (fee, 'chains', []);
            for (let i = 0; i < chains.length; i++) {
                const chain = chains[i];
                const networkId = this.safeString (chain, 'chainId');
                const networkCode = this.networkIdToCode (networkId, this.safeString (currency, 'code'));
                const withdrawFee = this.safeString (chain, 'withdrawalMinFee');
                if (minFee === undefined || (Precise.stringLt (withdrawFee, minFee))) {
                    minFee = withdrawFee;
                }
                result['networks'][networkCode] = {
                    'withdraw': this.parseNumber (withdrawFee),
                    'deposit': {
                        'fee': undefined,
                        'percentage': undefined,
                    },
                };
            }
            result['withdraw']['fee'] = this.parseNumber (minFee);
        }
        return result;
    }

    isFuturesMethod (methodName, params) {
        //
        // Helper
        // @methodName (string): The name of the method
        // @params (dict): The parameters passed into {methodName}
        // @return: true if the method used is meant for futures trading, false otherwise
        //
        const defaultType = this.safeString2 (this.options, methodName, 'defaultType', 'trade');
        const requestedType = this.safeString (params, 'type', defaultType);
        const accountsByType = this.safeDict (this.options, 'accountsByType');
        const type = this.safeString (accountsByType, requestedType);
        if (type === undefined) {
            const keys = Object.keys (accountsByType);
            throw new ExchangeError (this.id + ' isFuturesMethod() type must be one of ' + keys.join (', '));
        }
        params = this.omit (params, 'type');
        return (type === 'contract') || (type === 'future') || (type === 'futures'); // * (type === 'futures') deprecated, use (type === 'future')
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        //
        //     {
        //         "symbol": "BTC-USDT",   // symbol
        //         "symbolName":"BTC-USDT", // Name of trading pairs, it would change after renaming
        //         "buy": "11328.9",   // bestAsk
        //         "sell": "11329",    // bestBid
        //         "changeRate": "-0.0055",    // 24h change rate
        //         "changePrice": "-63.6", // 24h change price
        //         "high": "11610",    // 24h highest price
        //         "low": "11200", // 24h lowest price
        //         "vol": "2282.70993217", // 24h volume，the aggregated trading volume in BTC
        //         "volValue": "25984946.157790431",   // 24h total, the trading volume in quote currency of last 24 hours
        //         "last": "11328.9",  // last price
        //         "averagePrice": "11360.66065903",   // 24h average transaction price yesterday
        //         "takerFeeRate": "0.001",    // Basic Taker Fee
        //         "makerFeeRate": "0.001",    // Basic Maker Fee
        //         "takerCoefficient": "1",    // Taker Fee Coefficient
        //         "makerCoefficient": "1" // Maker Fee Coefficient
        //     }
        //
        //     {
        //         "trading": true,
        //         "symbol": "KCS-BTC",
        //         "buy": 0.00011,
        //         "sell": 0.00012,
        //         "sort": 100,
        //         "volValue": 3.13851792584,   //total
        //         "baseCurrency": "KCS",
        //         "market": "BTC",
        //         "quoteCurrency": "BTC",
        //         "symbolCode": "KCS-BTC",
        //         "datetime": 1548388122031,
        //         "high": 0.00013,
        //         "vol": 27514.34842,
        //         "low": 0.0001,
        //         "changePrice": -1.0e-5,
        //         "changeRate": -0.0769,
        //         "lastTradedPrice": 0.00012,
        //         "board": 0,
        //         "mark": 0
        //     }
        //
        // market/ticker ws subscription
        //
        //     {
        //         "bestAsk": "62258.9",
        //         "bestAskSize": "0.38579986",
        //         "bestBid": "62258.8",
        //         "bestBidSize": "0.0078381",
        //         "price": "62260.7",
        //         "sequence": "1621383297064",
        //         "size": "0.00002841",
        //         "time": 1634641777363
        //     }
        //
        let percentage = this.safeString (ticker, 'changeRate');
        if (percentage !== undefined) {
            percentage = Precise.stringMul (percentage, '100');
        }
        let last = this.safeString2 (ticker, 'last', 'lastTradedPrice');
        last = this.safeString (ticker, 'price', last);
        const marketId = this.safeString (ticker, 'symbol');
        market = this.safeMarket (marketId, market, '-');
        const symbol = market['symbol'];
        const baseVolume = this.safeString (ticker, 'vol');
        const quoteVolume = this.safeString (ticker, 'volValue');
        const timestamp = this.safeInteger2 (ticker, 'time', 'datetime');
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeString (ticker, 'high'),
            'low': this.safeString (ticker, 'low'),
            'bid': this.safeString2 (ticker, 'buy', 'bestBid'),
            'bidVolume': this.safeString (ticker, 'bestBidSize'),
            'ask': this.safeString2 (ticker, 'sell', 'bestAsk'),
            'askVolume': this.safeString (ticker, 'bestAskSize'),
            'vwap': undefined,
            'open': this.safeString (ticker, 'open'),
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': this.safeString (ticker, 'changePrice'),
            'percentage': percentage,
            'average': this.safeString (ticker, 'averagePrice'),
            'baseVolume': baseVolume,
            'quoteVolume': quoteVolume,
            'info': ticker,
        }, market);
    }

    async fetchTickers (symbols: Strings = undefined, params = {}): Promise<Tickers> {
        /**
         * @method
         * @name kucoin#fetchTickers
         * @description fetches price tickers for multiple markets, statistical information calculated over the past 24 hours for each market
         * @see https://docs.kucoin.com/#get-all-tickers
         * @param {string[]|undefined} symbols unified symbols of the markets to fetch the ticker for, all market tickers are returned if not assigned
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/#/?id=ticker-structure}
         */
        await this.loadMarkets ();
        symbols = this.marketSymbols (symbols);
        const response = await this.publicGetMarketAllTickers (params);
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "time":1602832092060,
        //             "ticker":[
        //                 {
        //                     "symbol": "BTC-USDT",   // symbol
        //                     "symbolName":"BTC-USDT", // Name of trading pairs, it would change after renaming
        //                     "buy": "11328.9",   // bestAsk
        //                     "sell": "11329",    // bestBid
        //                     "changeRate": "-0.0055",    // 24h change rate
        //                     "changePrice": "-63.6", // 24h change price
        //                     "high": "11610",    // 24h highest price
        //                     "low": "11200", // 24h lowest price
        //                     "vol": "2282.70993217", // 24h volume，the aggregated trading volume in BTC
        //                     "volValue": "25984946.157790431",   // 24h total, the trading volume in quote currency of last 24 hours
        //                     "last": "11328.9",  // last price
        //                     "averagePrice": "11360.66065903",   // 24h average transaction price yesterday
        //                     "takerFeeRate": "0.001",    // Basic Taker Fee
        //                     "makerFeeRate": "0.001",    // Basic Maker Fee
        //                     "takerCoefficient": "1",    // Taker Fee Coefficient
        //                     "makerCoefficient": "1" // Maker Fee Coefficient
        //                 }
        //             ]
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        const tickers = this.safeList (data, 'ticker', []);
        const time = this.safeInteger (data, 'time');
        const result: Dict = {};
        for (let i = 0; i < tickers.length; i++) {
            tickers[i]['time'] = time;
            const ticker = this.parseTicker (tickers[i]);
            const symbol = this.safeString (ticker, 'symbol');
            if (symbol !== undefined) {
                result[symbol] = ticker;
            }
        }
        return this.filterByArrayTickers (result, 'symbol', symbols);
    }

    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        /**
         * @method
         * @name kucoin#fetchTicker
         * @description fetches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market
         * @see https://docs.kucoin.com/#get-24hr-stats
         * @param {string} symbol unified symbol of the market to fetch the ticker for
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/#/?id=ticker-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
        };
        const response = await this.publicGetMarketStats (this.extend (request, params));
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "time": 1602832092060,  // time
        //             "symbol": "BTC-USDT",   // symbol
        //             "buy": "11328.9",   // bestAsk
        //             "sell": "11329",    // bestBid
        //             "changeRate": "-0.0055",    // 24h change rate
        //             "changePrice": "-63.6", // 24h change price
        //             "high": "11610",    // 24h highest price
        //             "low": "11200", // 24h lowest price
        //             "vol": "2282.70993217", // 24h volume，the aggregated trading volume in BTC
        //             "volValue": "25984946.157790431",   // 24h total, the trading volume in quote currency of last 24 hours
        //             "last": "11328.9",  // last price
        //             "averagePrice": "11360.66065903",   // 24h average transaction price yesterday
        //             "takerFeeRate": "0.001",    // Basic Taker Fee
        //             "makerFeeRate": "0.001",    // Basic Maker Fee
        //             "takerCoefficient": "1",    // Taker Fee Coefficient
        //             "makerCoefficient": "1" // Maker Fee Coefficient
        //         }
        //     }
        //
        return this.parseTicker (response['data'], market);
    }

    parseOHLCV (ohlcv, market: Market = undefined): OHLCV {
        //
        //     [
        //         "1545904980",             // Start time of the candle cycle
        //         "0.058",                  // opening price
        //         "0.049",                  // closing price
        //         "0.058",                  // highest price
        //         "0.049",                  // lowest price
        //         "0.018",                  // base volume
        //         "0.000945",               // quote volume
        //     ]
        //
        return [
            this.safeTimestamp (ohlcv, 0),
            this.safeNumber (ohlcv, 1),
            this.safeNumber (ohlcv, 3),
            this.safeNumber (ohlcv, 4),
            this.safeNumber (ohlcv, 2),
            this.safeNumber (ohlcv, 5),
        ];
    }

    async fetchOHLCV (symbol: string, timeframe = '1m', since: Int = undefined, limit: Int = undefined, params = {}): Promise<OHLCV[]> {
        /**
         * @method
         * @name kucoin#fetchOHLCV
         * @description fetches historical candlestick data containing the open, high, low, and close price, and the volume of a market
         * @see https://docs.kucoin.com/#get-klines
         * @param {string} symbol unified symbol of the market to fetch OHLCV data for
         * @param {string} timeframe the length of time each candle represents
         * @param {int} [since] timestamp in ms of the earliest candle to fetch
         * @param {int} [limit] the maximum amount of candles to fetch
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {boolean} [params.paginate] default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the [availble parameters](https://github.com/ccxt/ccxt/wiki/Manual#pagination-params)
         * @returns {int[][]} A list of candles ordered as timestamp, open, high, low, close, volume
         */
        await this.loadMarkets ();
        let paginate = false;
        [ paginate, params ] = this.handleOptionAndParams (params, 'fetchOHLCV', 'paginate');
        if (paginate) {
            return await this.fetchPaginatedCallDeterministic ('fetchOHLCV', symbol, since, limit, timeframe, params, 1500) as OHLCV[];
        }
        const market = this.market (symbol);
        const marketId = market['id'];
        const request: Dict = {
            'symbol': marketId,
            'type': this.safeString (this.timeframes, timeframe, timeframe),
        };
        const duration = this.parseTimeframe (timeframe) * 1000;
        let endAt = this.milliseconds (); // required param
        if (since !== undefined) {
            request['startAt'] = this.parseToInt (Math.floor (since / 1000));
            if (limit === undefined) {
                // https://docs.kucoin.com/#get-klines
                // https://docs.kucoin.com/#details
                // For each query, the system would return at most 1500 pieces of data.
                // To obtain more data, please page the data by time.
                limit = this.safeInteger (this.options, 'fetchOHLCVLimit', 1500);
            }
            endAt = this.sum (since, limit * duration);
        } else if (limit !== undefined) {
            since = endAt - limit * duration;
            request['startAt'] = this.parseToInt (Math.floor (since / 1000));
        }
        request['endAt'] = this.parseToInt (Math.floor (endAt / 1000));
        const response = await this.publicGetMarketCandles (this.extend (request, params));
        //
        //     {
        //         "code":"200000",
        //         "data":[
        //             ["1591517700","0.025078","0.025069","0.025084","0.025064","18.9883256","0.4761861079404"],
        //             ["1591516800","0.025089","0.025079","0.025089","0.02506","99.4716622","2.494143499081"],
        //             ["1591515900","0.025079","0.02509","0.025091","0.025068","59.83701271","1.50060885172798"],
        //         ]
        //     }
        //
        const data = this.safeList (response, 'data', []);
        return this.parseOHLCVs (data, market, timeframe, since, limit);
    }

    async createDepositAddress (code: string, params = {}) {
        /**
         * @method
         * @name kucoin#createDepositAddress
         * @see https://docs.kucoin.com/#create-deposit-address
         * @description create a currency deposit address
         * @param {string} code unified currency code of the currency for the deposit address
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {string} [params.network] the blockchain network name
         * @returns {object} an [address structure]{@link https://docs.ccxt.com/#/?id=address-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
        };
        let networkCode = undefined;
        [ networkCode, params ] = this.handleNetworkCodeAndParams (params);
        if (networkCode !== undefined) {
            request['chain'] = this.networkCodeToId (networkCode).toLowerCase ();
        }
        const response = await this.privatePostDepositAddresses (this.extend (request, params));
        // {"code":"260000","msg":"Deposit address already exists."}
        // BCH {"code":"200000","data":{"address":"bitcoincash:qza3m4nj9rx7l9r0cdadfqxts6f92shvhvr5ls4q7z","memo":""}}
        // BTC {"code":"200000","data":{"address":"36SjucKqQpQSvsak9A7h6qzFjrVXpRNZhE","memo":""}}
        const data = this.safeDict (response, 'data', {});
        return this.parseDepositAddress (data, currency);
    }

    async fetchDepositAddress (code: string, params = {}) {
        /**
         * @method
         * @name kucoin#fetchDepositAddress
         * @description fetch the deposit address for a currency associated with this account
         * @see https://docs.kucoin.com/#get-deposit-addresses-v2
         * @param {string} code unified currency code
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {string} [params.network] the blockchain network name
         * @returns {object} an [address structure]{@link https://docs.ccxt.com/#/?id=address-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
            // for USDT - OMNI, ERC20, TRC20, default is ERC20
            // for BTC - Native, Segwit, TRC20, the parameters are bech32, btc, trx, default is Native
            // 'chain': 'ERC20', // optional
        };
        let networkCode = undefined;
        [ networkCode, params ] = this.handleNetworkCodeAndParams (params);
        if (networkCode !== undefined) {
            request['chain'] = this.networkCodeToId (networkCode).toLowerCase ();
        }
        const version = this.options['versions']['private']['GET']['deposit-addresses'];
        this.options['versions']['private']['GET']['deposit-addresses'] = 'v1';
        const response = await this.privateGetDepositAddresses (this.extend (request, params));
        // BCH {"code":"200000","data":{"address":"bitcoincash:qza3m4nj9rx7l9r0cdadfqxts6f92shvhvr5ls4q7z","memo":""}}
        // BTC {"code":"200000","data":{"address":"36SjucKqQpQSvsak9A7h6qzFjrVXpRNZhE","memo":""}}
        this.options['versions']['private']['GET']['deposit-addresses'] = version;
        const data = this.safeValue (response, 'data');
        if (data === undefined) {
            throw new ExchangeError (this.id + ' fetchDepositAddress() returned an empty response, you might try to run createDepositAddress() first and try again');
        }
        return this.parseDepositAddress (data, currency);
    }

    parseDepositAddress (depositAddress, currency: Currency = undefined) {
        let address = this.safeString (depositAddress, 'address');
        // BCH/BSV is returned with a "bitcoincash:" prefix, which we cut off here and only keep the address
        if (address !== undefined) {
            address = address.replace ('bitcoincash:', '');
        }
        let code = undefined;
        if (currency !== undefined) {
            code = this.safeCurrencyCode (currency['id']);
            if (code !== 'NIM') {
                // contains spaces
                this.checkAddress (address);
            }
        }
        return {
            'info': depositAddress,
            'currency': code,
            'address': address,
            'tag': this.safeString (depositAddress, 'memo'),
            'network': this.networkIdToCode (this.safeString (depositAddress, 'chain')),
        };
    }

    async fetchDepositAddressesByNetwork (code: string, params = {}) {
        /**
         * @method
         * @name kucoin#fetchDepositAddressesByNetwork
         * @see https://docs.kucoin.com/#get-deposit-addresses-v2
         * @description fetch the deposit address for a currency associated with this account
         * @param {string} code unified currency code
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} an array of [address structures]{@link https://docs.ccxt.com/#/?id=address-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
        };
        const version = this.options['versions']['private']['GET']['deposit-addresses'];
        this.options['versions']['private']['GET']['deposit-addresses'] = 'v2';
        const response = await this.privateGetDepositAddresses (this.extend (request, params));
        //
        //     {
        //         "code": "200000",
        //         "data": [
        //             {
        //                 "address": "fr1qvus7d4d5fgxj5e7zvqe6yhxd7txm95h2and69r",
        //                 "memo": "",
        //                 "chain": "BTC-Segwit",
        //                 "contractAddress": ""
        //             },
        //             {"address":"37icNMEWbiF8ZkwUMxmfzMxi2A1MQ44bMn","memo":"","chain":"BTC","contractAddress":""},
        //             {"address":"Deposit temporarily blocked","memo":"","chain":"TRC20","contractAddress":""}
        //         ]
        //     }
        //
        this.options['versions']['private']['GET']['deposit-addresses'] = version;
        const chains = this.safeList (response, 'data', []);
        const parsed = this.parseDepositAddresses (chains, [ currency['code'] ], false, {
            'currency': currency['code'],
        });
        return this.indexBy (parsed, 'network');
    }

    async fetchOrderBook (symbol: string, limit: Int = undefined, params = {}): Promise<OrderBook> {
        /**
         * @method
         * @name kucoin#fetchOrderBook
         * @description fetches information on open orders with bid (buy) and ask (sell) prices, volumes and other data
         * @see https://www.kucoin.com/docs/rest/spot-trading/market-data/get-part-order-book-aggregated-
         * @see https://www.kucoin.com/docs/rest/spot-trading/market-data/get-full-order-book-aggregated-
         * @param {string} symbol unified symbol of the market to fetch the order book for
         * @param {int} [limit] the maximum amount of order book entries to return
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} A dictionary of [order book structures]{@link https://docs.ccxt.com/#/?id=order-book-structure} indexed by market symbols
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const level = this.safeInteger (params, 'level', 2);
        const request: Dict = { 'symbol': market['id'] };
        const isAuthenticated = this.checkRequiredCredentials (false);
        let response = undefined;
        if (!isAuthenticated || limit !== undefined) {
            if (level === 2) {
                request['level'] = level;
                if (limit !== undefined) {
                    if ((limit === 20) || (limit === 100)) {
                        request['limit'] = limit;
                    } else {
                        throw new ExchangeError (this.id + ' fetchOrderBook() limit argument must be 20 or 100');
                    }
                }
                request['limit'] = limit ? limit : 100;
            }
            response = await this.publicGetMarketOrderbookLevelLevelLimit (this.extend (request, params));
        } else {
            response = await this.privateGetMarketOrderbookLevel2 (this.extend (request, params));
        }
        //
        // public (v1) market/orderbook/level2_20 and market/orderbook/level2_100
        //
        //     {
        //         "sequence": "3262786978",
        //         "time": 1550653727731,
        //         "bids": [
        //             ["6500.12", "0.45054140"],
        //             ["6500.11", "0.45054140"],
        //         ],
        //         "asks": [
        //             ["6500.16", "0.57753524"],
        //             ["6500.15", "0.57753524"],
        //         ]
        //     }
        //
        // private (v3) market/orderbook/level2
        //
        //     {
        //         "sequence": "3262786978",
        //         "time": 1550653727731,
        //         "bids": [
        //             ["6500.12", "0.45054140"],
        //             ["6500.11", "0.45054140"],
        //         ],
        //         "asks": [
        //             ["6500.16", "0.57753524"],
        //             ["6500.15", "0.57753524"],
        //         ]
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        const timestamp = this.safeInteger (data, 'time');
        const orderbook = this.parseOrderBook (data, market['symbol'], timestamp, 'bids', 'asks', level - 2, level - 1);
        orderbook['nonce'] = this.safeInteger (data, 'sequence');
        return orderbook;
    }

    handleTriggerPrices (params) {
        const triggerPrice = this.safeValue2 (params, 'triggerPrice', 'stopPrice');
        const stopLossPrice = this.safeValue (params, 'stopLossPrice');
        const takeProfitPrice = this.safeValue (params, 'takeProfitPrice');
        const isStopLoss = stopLossPrice !== undefined;
        const isTakeProfit = takeProfitPrice !== undefined;
        if ((isStopLoss && isTakeProfit) || (triggerPrice && stopLossPrice) || (triggerPrice && isTakeProfit)) {
            throw new ExchangeError (this.id + ' createOrder() - you should use either triggerPrice or stopLossPrice or takeProfitPrice');
        }
        return [ triggerPrice, stopLossPrice, takeProfitPrice ];
    }

    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#createOrder
         * @description Create an order on the exchange
         * @see https://docs.kucoin.com/spot#place-a-new-order
         * @see https://docs.kucoin.com/spot#place-a-new-order-2
         * @see https://docs.kucoin.com/spot#place-a-margin-order
         * @see https://docs.kucoin.com/spot-hf/#place-hf-order
         * @see https://www.kucoin.com/docs/rest/spot-trading/orders/place-order-test
         * @see https://www.kucoin.com/docs/rest/margin-trading/orders/place-margin-order-test
         * @param {string} symbol Unified CCXT market symbol
         * @param {string} type 'limit' or 'market'
         * @param {string} side 'buy' or 'sell'
         * @param {float} amount the amount of currency to trade
         * @param {float} [price] the price at which the order is to be fulfilled, in units of the quote currency, ignored in market orders
         * @param {object} [params]  extra parameters specific to the exchange API endpoint
         * @param {float} [params.triggerPrice] The price at which a trigger order is triggered at
         * @param {string} [params.marginMode] 'cross', // cross (cross mode) and isolated (isolated mode), set to cross by default, the isolated mode will be released soon, stay tuned
         * @param {string} [params.timeInForce] GTC, GTT, IOC, or FOK, default is GTC, limit orders only
         * @param {string} [params.postOnly] Post only flag, invalid when timeInForce is IOC or FOK
         *
         * EXCHANGE SPECIFIC PARAMETERS
         * @param {string} [params.clientOid] client order id, defaults to uuid if not passed
         * @param {string} [params.remark] remark for the order, length cannot exceed 100 utf8 characters
         * @param {string} [params.tradeType] 'TRADE', // TRADE, MARGIN_TRADE // not used with margin orders
         * limit orders ---------------------------------------------------
         * @param {float} [params.cancelAfter] long, // cancel after n seconds, requires timeInForce to be GTT
         * @param {bool} [params.hidden] false, // Order will not be displayed in the order book
         * @param {bool} [params.iceberg] false, // Only a portion of the order is displayed in the order book
         * @param {string} [params.visibleSize] this.amountToPrecision (symbol, visibleSize), // The maximum visible size of an iceberg order
         * market orders --------------------------------------------------
         * @param {string} [params.funds] // Amount of quote currency to use
         * stop orders ----------------------------------------------------
         * @param {string} [params.stop]  Either loss or entry, the default is loss. Requires stopPrice to be defined
         * margin orders --------------------------------------------------
         * @param {float} [params.leverage] Leverage size of the order
         * @param {string} [params.stp] '', // self trade prevention, CN, CO, CB or DC
         * @param {bool} [params.autoBorrow] false, // The system will first borrow you funds at the optimal interest rate and then place an order for you
         * @param {bool} [params.hf] false, // true for hf order
         * @param {bool} [params.test] set to true to test an order, no order will be created but the request will be validated
         * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const testOrder = this.safeBool (params, 'test', false);
        params = this.omit (params, 'test');
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        const [ triggerPrice, stopLossPrice, takeProfitPrice ] = this.handleTriggerPrices (params);
        const tradeType = this.safeString (params, 'tradeType'); // keep it for backward compatibility
        const isTriggerOrder = (triggerPrice || stopLossPrice || takeProfitPrice);
        const marginResult = this.handleMarginModeAndParams ('createOrder', params);
        const marginMode = this.safeString (marginResult, 0);
        const isMarginOrder = tradeType === 'MARGIN_TRADE' || marginMode !== undefined;
        // don't omit anything before calling createOrderRequest
        const orderRequest = this.createOrderRequest (symbol, type, side, amount, price, params);
        let response = undefined;
        if (testOrder) {
            if (isMarginOrder) {
                response = await this.privatePostMarginOrderTest (orderRequest);
            } else if (hf) {
                response = await this.privatePostHfOrdersTest (orderRequest);
            } else {
                response = await this.privatePostOrdersTest (orderRequest);
            }
        } else if (isTriggerOrder) {
            response = await this.privatePostStopOrder (orderRequest);
        } else if (isMarginOrder) {
            response = await this.privatePostMarginOrder (orderRequest);
        } else if (hf) {
            response = await this.privatePostHfOrders (orderRequest);
        } else {
            response = await this.privatePostOrders (orderRequest);
        }
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "orderId": "5bd6e9286d99522a52e458de"
        //         }
        //    }
        //
        const data = this.safeDict (response, 'data', {});
        return this.parseOrder (data, market);
    }

    async createMarketOrderWithCost (symbol: string, side: OrderSide, cost: number, params = {}) {
        /**
         * @method
         * @name kucoin#createMarketOrderWithCost
         * @description create a market order by providing the symbol, side and cost
         * @see https://www.kucoin.com/docs/rest/spot-trading/orders/place-order
         * @param {string} symbol unified symbol of the market to create an order in
         * @param {string} side 'buy' or 'sell'
         * @param {float} cost how much you want to trade in units of the quote currency
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        params['cost'] = cost;
        return await this.createOrder (symbol, 'market', side, cost, undefined, params);
    }

    async createMarketBuyOrderWithCost (symbol: string, cost: number, params = {}) {
        /**
         * @method
         * @name kucoin#createMarketBuyOrderWithCost
         * @description create a market buy order by providing the symbol and cost
         * @see https://www.kucoin.com/docs/rest/spot-trading/orders/place-order
         * @param {string} symbol unified symbol of the market to create an order in
         * @param {float} cost how much you want to trade in units of the quote currency
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        return await this.createMarketOrderWithCost (symbol, 'buy', cost, params);
    }

    async createMarketSellOrderWithCost (symbol: string, cost: number, params = {}) {
        /**
         * @method
         * @name kucoin#createMarketSellOrderWithCost
         * @description create a market sell order by providing the symbol and cost
         * @see https://www.kucoin.com/docs/rest/spot-trading/orders/place-order
         * @param {string} symbol unified symbol of the market to create an order in
         * @param {float} cost how much you want to trade in units of the quote currency
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        return await this.createMarketOrderWithCost (symbol, 'sell', cost, params);
    }

    async createOrders (orders: OrderRequest[], params = {}) {
        /**
         * @method
         * @name kucoin#createOrders
         * @description create a list of trade orders
         * @see https://www.kucoin.com/docs/rest/spot-trading/orders/place-multiple-orders
         * @see https://www.kucoin.com/docs/rest/spot-trading/spot-hf-trade-pro-account/place-multiple-hf-orders
         * @param {Array} orders list of orders to create, each object should contain the parameters required by createOrder, namely symbol, type, side, amount, price and params
         * @param {object} [params]  extra parameters specific to the exchange API endpoint
         * @param {bool} [params.hf] false, // true for hf orders
         * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        const ordersRequests = [];
        let symbol = undefined;
        for (let i = 0; i < orders.length; i++) {
            const rawOrder = orders[i];
            const marketId = this.safeString (rawOrder, 'symbol');
            if (symbol === undefined) {
                symbol = marketId;
            } else {
                if (symbol !== marketId) {
                    throw new BadRequest (this.id + ' createOrders() requires all orders to have the same symbol');
                }
            }
            const type = this.safeString (rawOrder, 'type');
            if (type !== 'limit') {
                throw new BadRequest (this.id + ' createOrders() only supports limit orders');
            }
            const side = this.safeString (rawOrder, 'side');
            const amount = this.safeValue (rawOrder, 'amount');
            const price = this.safeValue (rawOrder, 'price');
            const orderParams = this.safeValue (rawOrder, 'params', {});
            const orderRequest = this.createOrderRequest (marketId, type, side, amount, price, orderParams);
            ordersRequests.push (orderRequest);
        }
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
            'orderList': ordersRequests,
        };
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        let response = undefined;
        if (hf) {
            response = await this.privatePostHfOrdersMulti (this.extend (request, params));
        } else {
            response = await this.privatePostOrdersMulti (this.extend (request, params));
        }
        //
        // {
        //     "code": "200000",
        //     "data": {
        //        "data": [
        //           {
        //              "symbol": "LTC-USDT",
        //              "type": "limit",
        //              "side": "sell",
        //              "price": "90",
        //              "size": "0.1",
        //              "funds": null,
        //              "stp": "",
        //              "stop": "",
        //              "stopPrice": null,
        //              "timeInForce": "GTC",
        //              "cancelAfter": 0,
        //              "postOnly": false,
        //              "hidden": false,
        //              "iceberge": false,
        //              "iceberg": false,
        //              "visibleSize": null,
        //              "channel": "API",
        //              "id": "6539148443fcf500079d15e5",
        //              "status": "success",
        //              "failMsg": null,
        //              "clientOid": "5c4c5398-8ab2-4b4e-af8a-e2d90ad2488f"
        //           },
        // }
        //
        let data = this.safeDict (response, 'data', {});
        data = this.safeList (data, 'data', []);
        return this.parseOrders (data);
    }

    marketOrderAmountToPrecision (symbol: string, amount) {
        const market = this.market (symbol);
        const result = this.decimalToPrecision (amount, TRUNCATE, market['info']['quoteIncrement'], this.precisionMode, this.paddingMode);
        if (result === '0') {
            throw new InvalidOrder (this.id + ' amount of ' + market['symbol'] + ' must be greater than minimum amount precision of ' + this.numberToString (market['precision']['amount']));
        }
        return result;
    }

    createOrderRequest (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}) {
        const market = this.market (symbol);
        // required param, cannot be used twice
        const clientOrderId = this.safeString2 (params, 'clientOid', 'clientOrderId', this.uuid ());
        params = this.omit (params, [ 'clientOid', 'clientOrderId' ]);
        const request: Dict = {
            'clientOid': clientOrderId,
            'side': side,
            'symbol': market['id'],
            'type': type, // limit or market
        };
        const quoteAmount = this.safeNumber2 (params, 'cost', 'funds');
        let amountString = undefined;
        let costString = undefined;
        let marginMode = undefined;
        [ marginMode, params ] = this.handleMarginModeAndParams ('createOrder', params);
        if (type === 'market') {
            if (quoteAmount !== undefined) {
                params = this.omit (params, [ 'cost', 'funds' ]);
                // kucoin uses base precision even for quote values
                costString = this.marketOrderAmountToPrecision (symbol, quoteAmount);
                request['funds'] = costString;
            } else {
                amountString = this.amountToPrecision (symbol, amount);
                request['size'] = this.amountToPrecision (symbol, amount);
            }
        } else {
            amountString = this.amountToPrecision (symbol, amount);
            request['size'] = amountString;
            request['price'] = this.priceToPrecision (symbol, price);
        }
        const tradeType = this.safeString (params, 'tradeType'); // keep it for backward compatibility
        const [ triggerPrice, stopLossPrice, takeProfitPrice ] = this.handleTriggerPrices (params);
        const isTriggerOrder = (triggerPrice || stopLossPrice || takeProfitPrice);
        const isMarginOrder = tradeType === 'MARGIN_TRADE' || marginMode !== undefined;
        params = this.omit (params, [ 'stopLossPrice', 'takeProfitPrice', 'triggerPrice', 'stopPrice' ]);
        if (isTriggerOrder) {
            if (triggerPrice) {
                request['stopPrice'] = this.priceToPrecision (symbol, triggerPrice);
            } else if (stopLossPrice || takeProfitPrice) {
                if (stopLossPrice) {
                    request['stop'] = (side === 'buy') ? 'entry' : 'loss';
                    request['stopPrice'] = this.priceToPrecision (symbol, stopLossPrice);
                } else {
                    request['stop'] = (side === 'buy') ? 'loss' : 'entry';
                    request['stopPrice'] = this.priceToPrecision (symbol, takeProfitPrice);
                }
            }
            if (marginMode === 'isolated') {
                throw new BadRequest (this.id + ' createOrder does not support isolated margin for stop orders');
            } else if (marginMode === 'cross') {
                request['tradeType'] = this.options['marginModes'][marginMode];
            }
        } else if (isMarginOrder) {
            if (marginMode === 'isolated') {
                request['marginModel'] = 'isolated';
            }
        }
        let postOnly = undefined;
        [ postOnly, params ] = this.handlePostOnly (type === 'market', false, params);
        if (postOnly) {
            request['postOnly'] = true;
        }
        return this.extend (request, params);
    }

    async editOrder (id: string, symbol: string, type:OrderType, side: OrderSide, amount: Num = undefined, price: Num = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#editOrder
         * @description edit an order, kucoin currently only supports the modification of HF orders
         * @see https://docs.kucoin.com/spot-hf/#modify-order
         * @param {string} id order id
         * @param {string} symbol unified symbol of the market to create an order in
         * @param {string} type not used
         * @param {string} side not used
         * @param {float} amount how much of the currency you want to trade in units of the base currency
         * @param {float} [price] the price at which the order is to be fulfilled, in units of the quote currency, ignored in market orders
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {string} [params.clientOrderId] client order id, defaults to id if not passed
         * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
        };
        const clientOrderId = this.safeString2 (params, 'clientOid', 'clientOrderId');
        if (clientOrderId !== undefined) {
            request['clientOid'] = clientOrderId;
        } else {
            request['orderId'] = id;
        }
        if (amount !== undefined) {
            request['newSize'] = this.amountToPrecision (symbol, amount);
        }
        if (price !== undefined) {
            request['newPrice'] = this.priceToPrecision (symbol, price);
        }
        const response = await this.privatePostHfOrdersAlter (this.extend (request, params));
        //
        // {
        //     "code":"200000",
        //     "data":{
        //        "newOrderId":"6478d7a6c883280001e92d8b"
        //     }
        // }
        //
        const data = this.safeDict (response, 'data', {});
        return this.parseOrder (data, market);
    }

    async cancelOrder (id: string, symbol: Str = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#cancelOrder
         * @description cancels an open order
         * @see https://docs.kucoin.com/spot#cancel-an-order
         * @see https://docs.kucoin.com/spot#cancel-an-order-2
         * @see https://docs.kucoin.com/spot#cancel-single-order-by-clientoid
         * @see https://docs.kucoin.com/spot#cancel-single-order-by-clientoid-2
         * @see https://docs.kucoin.com/spot-hf/#cancel-orders-by-orderid
         * @see https://docs.kucoin.com/spot-hf/#cancel-order-by-clientoid
         * @param {string} id order id
         * @param {string} symbol unified symbol of the market the order was made in
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {bool} [params.stop] True if cancelling a stop order
         * @param {bool} [params.hf] false, // true for hf order
         * @returns Response from the exchange
         */
        await this.loadMarkets ();
        const request: Dict = {};
        const clientOrderId = this.safeString2 (params, 'clientOid', 'clientOrderId');
        const stop = this.safeBool2 (params, 'stop', 'trigger', false);
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        if (hf) {
            if (symbol === undefined) {
                throw new ArgumentsRequired (this.id + ' cancelOrder() requires a symbol parameter for hf orders');
            }
            const market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        let response = undefined;
        params = this.omit (params, [ 'clientOid', 'clientOrderId', 'stop', 'trigger' ]);
        if (clientOrderId !== undefined) {
            request['clientOid'] = clientOrderId;
            if (stop) {
                response = await this.privateDeleteStopOrderCancelOrderByClientOid (this.extend (request, params));
                //
                //    {
                //        code: '200000',
                //        data: {
                //          cancelledOrderId: 'vs8lgpiuao41iaft003khbbk',
                //          clientOid: '123456'
                //        }
                //    }
                //
            } else if (hf) {
                response = await this.privateDeleteHfOrdersClientOrderClientOid (this.extend (request, params));
                //
                //    {
                //        "code": "200000",
                //        "data": {
                //          "clientOid": "6d539dc614db3"
                //        }
                //    }
                //
            } else {
                response = await this.privateDeleteOrderClientOrderClientOid (this.extend (request, params));
                //
                //    {
                //        code: '200000',
                //        data: {
                //          cancelledOrderId: '665e580f6660500007aba341',
                //          clientOid: '1234567',
                //          cancelledOcoOrderIds: null
                //        }
                //    }
                //
            }
            response = this.safeDict (response, 'data');
            return this.parseOrder (response);
        } else {
            request['orderId'] = id;
            if (stop) {
                response = await this.privateDeleteStopOrderOrderId (this.extend (request, params));
                //
                //    {
                //        code: '200000',
                //        data: { cancelledOrderIds: [ 'vs8lgpiuaco91qk8003vebu9' ] }
                //    }
                //
            } else if (hf) {
                response = await this.privateDeleteHfOrdersOrderId (this.extend (request, params));
                //
                //    {
                //        "code": "200000",
                //        "data": {
                //          "orderId": "630625dbd9180300014c8d52"
                //        }
                //    }
                //
                response = this.safeDict (response, 'data');
                return this.parseOrder (response);
            } else {
                response = await this.privateDeleteOrdersOrderId (this.extend (request, params));
                //
                //    {
                //        code: '200000',
                //        data: { cancelledOrderIds: [ '665e4fbe28051a0007245c41' ] }
                //    }
                //
            }
            const data = this.safeDict (response, 'data');
            const orderIds = this.safeList (data, 'cancelledOrderIds', []);
            const orderId = this.safeString (orderIds, 0);
            return this.safeOrder ({
                'info': data,
                'id': orderId,
            });
        }
    }

    async cancelAllOrders (symbol: Str = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#cancelAllOrders
         * @description cancel all open orders
         * @see https://docs.kucoin.com/spot#cancel-all-orders
         * @see https://docs.kucoin.com/spot#cancel-orders
         * @see https://docs.kucoin.com/spot-hf/#cancel-all-hf-orders-by-symbol
         * @param {string} symbol unified market symbol, only orders in the market of this symbol are cancelled when symbol is not undefined
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {bool} [params.stop] *invalid for isolated margin* true if cancelling all stop orders
         * @param {string} [params.marginMode] 'cross' or 'isolated'
         * @param {string} [params.orderIds] *stop orders only* Comma seperated order IDs
         * @param {bool} [params.stop] True if cancelling a stop order
         * @param {bool} [params.hf] false, // true for hf order
         * @returns Response from the exchange
         */
        await this.loadMarkets ();
        const request: Dict = {};
        const stop = this.safeBool (params, 'stop', false);
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        params = this.omit (params, 'stop');
        const [ marginMode, query ] = this.handleMarginModeAndParams ('cancelAllOrders', params);
        if (symbol !== undefined) {
            request['symbol'] = this.marketId (symbol);
        }
        if (marginMode !== undefined) {
            request['tradeType'] = this.options['marginModes'][marginMode];
            if (marginMode === 'isolated' && stop) {
                throw new BadRequest (this.id + ' cancelAllOrders does not support isolated margin for stop orders');
            }
        }
        let response = undefined;
        if (stop) {
            response = await this.privateDeleteStopOrderCancel (this.extend (request, query));
        } else if (hf) {
            if (symbol === undefined) {
                response = await this.privateDeleteHfOrdersCancelAll (this.extend (request, query));
            } else {
                response = await this.privateDeleteHfOrders (this.extend (request, query));
            }
        } else {
            response = await this.privateDeleteOrders (this.extend (request, query));
        }
        return response;
    }

    async fetchOrdersByStatus (status, symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchOrdersByStatus
         * @description fetch a list of orders
         * @see https://docs.kucoin.com/spot#list-orders
         * @see https://docs.kucoin.com/spot#list-stop-orders
         * @see https://docs.kucoin.com/spot-hf/#obtain-list-of-active-hf-orders
         * @see https://docs.kucoin.com/spot-hf/#obtain-list-of-filled-hf-orders
         * @param {string} status *not used for stop orders* 'open' or 'closed'
         * @param {string} symbol unified market symbol
         * @param {int} [since] timestamp in ms of the earliest order
         * @param {int} [limit] max number of orders to return
         * @param {object} [params] exchange specific params
         * @param {int} [params.until] end time in ms
         * @param {bool} [params.stop] true if fetching stop orders
         * @param {string} [params.side] buy or sell
         * @param {string} [params.type] limit, market, limit_stop or market_stop
         * @param {string} [params.tradeType] TRADE for spot trading, MARGIN_TRADE for Margin Trading
         * @param {int} [params.currentPage] *stop orders only* current page
         * @param {string} [params.orderIds] *stop orders only* comma seperated order ID list
         * @param {bool} [params.stop] True if fetching a stop order
         * @param {bool} [params.hf] false, // true for hf order
         * @returns An [array of order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        let lowercaseStatus = status.toLowerCase ();
        const until = this.safeInteger (params, 'until');
        const stop = this.safeBool2 (params, 'stop', 'trigger', false);
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        if (hf && (symbol === undefined)) {
            throw new ArgumentsRequired (this.id + ' fetchOrdersByStatus() requires a symbol parameter for hf orders');
        }
        params = this.omit (params, [ 'stop', 'trigger', 'till', 'until' ]);
        const [ marginMode, query ] = this.handleMarginModeAndParams ('fetchOrdersByStatus', params);
        if (lowercaseStatus === 'open') {
            lowercaseStatus = 'active';
        } else if (lowercaseStatus === 'closed') {
            lowercaseStatus = 'done';
        }
        const request: Dict = {
            'status': lowercaseStatus,
        };
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if (since !== undefined) {
            request['startAt'] = since;
        }
        if (limit !== undefined) {
            request['pageSize'] = limit;
        }
        if (until) {
            request['endAt'] = until;
        }
        request['tradeType'] = this.safeString (this.options['marginModes'], marginMode, 'TRADE');
        let response = undefined;
        if (stop) {
            response = await this.privateGetStopOrder (this.extend (request, query));
        } else if (hf) {
            if (lowercaseStatus === 'active') {
                response = await this.privateGetHfOrdersActive (this.extend (request, query));
            } else if (lowercaseStatus === 'done') {
                response = await this.privateGetHfOrdersDone (this.extend (request, query));
            }
        } else {
            response = await this.privateGetOrders (this.extend (request, query));
        }
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "currentPage": 1,
        //             "pageSize": 1,
        //             "totalNum": 153408,
        //             "totalPage": 153408,
        //             "items": [
        //                 {
        //                     "id": "5c35c02703aa673ceec2a168",   //orderid
        //                     "symbol": "BTC-USDT",   //symbol
        //                     "opType": "DEAL",      // operation type,deal is pending order,cancel is cancel order
        //                     "type": "limit",       // order type,e.g. limit,markrt,stop_limit.
        //                     "side": "buy",         // transaction direction,include buy and sell
        //                     "price": "10",         // order price
        //                     "size": "2",           // order quantity
        //                     "funds": "0",          // order funds
        //                     "dealFunds": "0.166",  // deal funds
        //                     "dealSize": "2",       // deal quantity
        //                     "fee": "0",            // fee
        //                     "feeCurrency": "USDT", // charge fee currency
        //                     "stp": "",             // self trade prevention,include CN,CO,DC,CB
        //                     "stop": "",            // stop type
        //                     "stopTriggered": false,  // stop order is triggered
        //                     "stopPrice": "0",      // stop price
        //                     "timeInForce": "GTC",  // time InForce,include GTC,GTT,IOC,FOK
        //                     "postOnly": false,     // postOnly
        //                     "hidden": false,       // hidden order
        //                     "iceberg": false,      // iceberg order
        //                     "visibleSize": "0",    // display quantity for iceberg order
        //                     "cancelAfter": 0,      // cancel orders time，requires timeInForce to be GTT
        //                     "channel": "IOS",      // order source
        //                     "clientOid": "",       // user-entered order unique mark
        //                     "remark": "",          // remark
        //                     "tags": "",            // tag order source
        //                     "isActive": false,     // status before unfilled or uncancelled
        //                     "cancelExist": false,   // order cancellation transaction record
        //                     "createdAt": 1547026471000  // time
        //                 },
        //             ]
        //         }
        //    }
        const listData = this.safeList (response, 'data');
        if (listData !== undefined) {
            return this.parseOrders (listData, market, since, limit);
        }
        const responseData = this.safeDict (response, 'data', {});
        const orders = this.safeList (responseData, 'items', []);
        return this.parseOrders (orders, market, since, limit);
    }

    async fetchClosedOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        /**
         * @method
         * @name kucoin#fetchClosedOrders
         * @description fetches information on multiple closed orders made by the user
         * @see https://docs.kucoin.com/spot#list-orders
         * @see https://docs.kucoin.com/spot#list-stop-orders
         * @see https://docs.kucoin.com/spot-hf/#obtain-list-of-active-hf-orders
         * @see https://docs.kucoin.com/spot-hf/#obtain-list-of-filled-hf-orders
         * @param {string} symbol unified market symbol of the market orders were made in
         * @param {int} [since] the earliest time in ms to fetch orders for
         * @param {int} [limit] the maximum number of order structures to retrieve
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {int} [params.until] end time in ms
         * @param {string} [params.side] buy or sell
         * @param {string} [params.type] limit, market, limit_stop or market_stop
         * @param {string} [params.tradeType] TRADE for spot trading, MARGIN_TRADE for Margin Trading
         * @param {bool} [params.stop] True if fetching a stop order
         * @param {bool} [params.hf] false, // true for hf order
         * @param {boolean} [params.paginate] default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the [availble parameters](https://github.com/ccxt/ccxt/wiki/Manual#pagination-params)
         * @returns {Order[]} a list of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        let paginate = false;
        [ paginate, params ] = this.handleOptionAndParams (params, 'fetchClosedOrders', 'paginate');
        if (paginate) {
            return await this.fetchPaginatedCallDynamic ('fetchClosedOrders', symbol, since, limit, params) as Order[];
        }
        return await this.fetchOrdersByStatus ('done', symbol, since, limit, params);
    }

    async fetchOpenOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        /**
         * @method
         * @name kucoin#fetchOpenOrders
         * @description fetch all unfilled currently open orders
         * @see https://docs.kucoin.com/spot#list-orders
         * @see https://docs.kucoin.com/spot#list-stop-orders
         * @see https://docs.kucoin.com/spot-hf/#obtain-list-of-active-hf-orders
         * @see https://docs.kucoin.com/spot-hf/#obtain-list-of-filled-hf-orders
         * @param {string} symbol unified market symbol
         * @param {int} [since] the earliest time in ms to fetch open orders for
         * @param {int} [limit] the maximum number of  open orders structures to retrieve
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {int} [params.until] end time in ms
         * @param {bool} [params.stop] true if fetching stop orders
         * @param {string} [params.side] buy or sell
         * @param {string} [params.type] limit, market, limit_stop or market_stop
         * @param {string} [params.tradeType] TRADE for spot trading, MARGIN_TRADE for Margin Trading
         * @param {int} [params.currentPage] *stop orders only* current page
         * @param {string} [params.orderIds] *stop orders only* comma seperated order ID list
         * @param {bool} [params.stop] True if fetching a stop order
         * @param {bool} [params.hf] false, // true for hf order
         * @param {boolean} [params.paginate] default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the [availble parameters](https://github.com/ccxt/ccxt/wiki/Manual#pagination-params)
         * @returns {Order[]} a list of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        let paginate = false;
        [ paginate, params ] = this.handleOptionAndParams (params, 'fetchOpenOrders', 'paginate');
        if (paginate) {
            return await this.fetchPaginatedCallDynamic ('fetchOpenOrders', symbol, since, limit, params) as Order[];
        }
        return await this.fetchOrdersByStatus ('active', symbol, since, limit, params);
    }

    async fetchOrder (id: string, symbol: Str = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchOrder
         * @description fetch an order
         * @see https://docs.kucoin.com/spot#get-an-order
         * @see https://docs.kucoin.com/spot#get-single-active-order-by-clientoid
         * @see https://docs.kucoin.com/spot#get-single-order-info
         * @see https://docs.kucoin.com/spot#get-single-order-by-clientoid
         * @see https://docs.kucoin.com/spot-hf/#details-of-a-single-hf-order
         * @see https://docs.kucoin.com/spot-hf/#obtain-details-of-a-single-hf-order-using-clientoid
         * @param {string} id Order id
         * @param {string} symbol not sent to exchange except for stop orders with clientOid, but used internally by CCXT to filter
         * @param {object} [params] exchange specific parameters
         * @param {bool} [params.stop] true if fetching a stop order
         * @param {bool} [params.hf] false, // true for hf order
         * @param {bool} [params.clientOid] unique order id created by users to identify their orders
         * @returns An [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        const request: Dict = {};
        const clientOrderId = this.safeString2 (params, 'clientOid', 'clientOrderId');
        const stop = this.safeBool2 (params, 'stop', 'trigger', false);
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
        }
        if (hf) {
            if (symbol === undefined) {
                throw new ArgumentsRequired (this.id + ' fetchOrder() requires a symbol parameter for hf orders');
            }
            request['symbol'] = market['id'];
        }
        params = this.omit (params, [ 'stop', 'clientOid', 'clientOrderId', 'trigger' ]);
        let response = undefined;
        if (clientOrderId !== undefined) {
            request['clientOid'] = clientOrderId;
            if (stop) {
                if (symbol !== undefined) {
                    request['symbol'] = market['id'];
                }
                response = await this.privateGetStopOrderQueryOrderByClientOid (this.extend (request, params));
            } else if (hf) {
                response = await this.privateGetHfOrdersClientOrderClientOid (this.extend (request, params));
            } else {
                response = await this.privateGetOrderClientOrderClientOid (this.extend (request, params));
            }
        } else {
            // a special case for undefined ids
            // otherwise a wrong endpoint for all orders will be triggered
            // https://github.com/ccxt/ccxt/issues/7234
            if (id === undefined) {
                throw new InvalidOrder (this.id + ' fetchOrder() requires an order id');
            }
            request['orderId'] = id;
            if (stop) {
                response = await this.privateGetStopOrderOrderId (this.extend (request, params));
            } else if (hf) {
                response = await this.privateGetHfOrdersOrderId (this.extend (request, params));
            } else {
                response = await this.privateGetOrdersOrderId (this.extend (request, params));
            }
        }
        let responseData = this.safeDict (response, 'data', {});
        if (Array.isArray (responseData)) {
            responseData = this.safeValue (responseData, 0);
        }
        return this.parseOrder (responseData, market);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        //
        // createOrder
        //
        //    {
        //        "orderId": "63c97e47d686c5000159a656"
        //    }
        //
        // cancelOrder
        //
        //    {
        //        "cancelledOrderIds": [ "63c97e47d686c5000159a656" ]
        //    }
        //
        // fetchOpenOrders, fetchClosedOrders
        //
        //    {
        //        "id": "63c97ce8d686c500015793bb",
        //        "symbol": "USDC-USDT",
        //        "opType": "DEAL",
        //        "type": "limit",
        //        "side": "sell",
        //        "price": "1.05",
        //        "size": "1",
        //        "funds": "0",
        //        "dealFunds": "0",
        //        "dealSize": "0",
        //        "fee": "0",
        //        "feeCurrency": "USDT",
        //        "stp": "",
        //        "stop": "",
        //        "stopTriggered": false,
        //        "stopPrice": "0",
        //        "timeInForce": "GTC",
        //        "postOnly": false,
        //        "hidden": false,
        //        "iceberg": false,
        //        "visibleSize": "0",
        //        "cancelAfter": 0,
        //        "channel": "API",
        //        "clientOid": "d602d73f-5424-4751-bef0-8debce8f0a82",
        //        "remark": null,
        //        "tags": "partner:ccxt",
        //        "isActive": true,
        //        "cancelExist": false,
        //        "createdAt": 1674149096927,
        //        "tradeType": "TRADE"
        //    }
        //
        // stop orders (fetchOpenOrders, fetchClosedOrders)
        //
        //    {
        //        "id": "vs9f6ou9e864rgq8000t4qnm",
        //        "symbol": "USDC-USDT",
        //        "userId": "613a896885d8660006151f01",
        //        "status": "NEW",
        //        "type": "market",
        //        "side": "sell",
        //        "price": null,
        //        "size": "1.00000000000000000000",
        //        "funds": null,
        //        "stp": null,
        //        "timeInForce": "GTC",
        //        "cancelAfter": -1,
        //        "postOnly": false,
        //        "hidden": false,
        //        "iceberg": false,
        //        "visibleSize": null,
        //        "channel": "API",
        //        "clientOid": "5d3fd727-6456-438d-9550-40d9d85eee0b",
        //        "remark": null,
        //        "tags": "partner:ccxt",
        //        "relatedNo": null,
        //        "orderTime": 1674146316994000028,
        //        "domainId": "kucoin",
        //        "tradeSource": "USER",
        //        "tradeType": "MARGIN_TRADE",
        //        "feeCurrency": "USDT",
        //        "takerFeeRate": "0.00100000000000000000",
        //        "makerFeeRate": "0.00100000000000000000",
        //        "createdAt": 1674146316994,
        //        "stop": "loss",
        //        "stopTriggerTime": null,
        //        "stopPrice": "0.97000000000000000000"
        //    }
        // hf order
        //    {
        //        "id":"6478cf1439bdfc0001528a1d",
        //        "symbol":"LTC-USDT",
        //        "opType":"DEAL",
        //        "type":"limit",
        //        "side":"buy",
        //        "price":"50",
        //        "size":"0.1",
        //        "funds":"5",
        //        "dealSize":"0",
        //        "dealFunds":"0",
        //        "fee":"0",
        //        "feeCurrency":"USDT",
        //        "stp":null,
        //        "timeInForce":"GTC",
        //        "postOnly":false,
        //        "hidden":false,
        //        "iceberg":false,
        //        "visibleSize":"0",
        //        "cancelAfter":0,
        //        "channel":"API",
        //        "clientOid":"d4d2016b-8e3a-445c-aa5d-dc6df5d1678d",
        //        "remark":null,
        //        "tags":"partner:ccxt",
        //        "cancelExist":false,
        //        "createdAt":1685638932074,
        //        "lastUpdatedAt":1685639013735,
        //        "tradeType":"TRADE",
        //        "inOrderBook":true,
        //        "cancelledSize":"0",
        //        "cancelledFunds":"0",
        //        "remainSize":"0.1",
        //        "remainFunds":"5",
        //        "active":true
        //    }
        //
        const marketId = this.safeString (order, 'symbol');
        const timestamp = this.safeInteger (order, 'createdAt');
        const feeCurrencyId = this.safeString (order, 'feeCurrency');
        const cancelExist = this.safeBool (order, 'cancelExist', false);
        const responseStop = this.safeString (order, 'stop');
        const stop = responseStop !== undefined;
        const stopTriggered = this.safeBool (order, 'stopTriggered', false);
        const isActive = this.safeBool2 (order, 'isActive', 'active');
        const responseStatus = this.safeString (order, 'status');
        let status = undefined;
        if (isActive !== undefined) {
            if (isActive === true) {
                status = 'open';
            } else {
                status = 'closed';
            }
        }
        if (stop) {
            if (responseStatus === 'NEW') {
                status = 'open';
            } else if (!isActive && !stopTriggered) {
                status = 'cancelled';
            }
        }
        if (cancelExist) {
            status = 'canceled';
        }
        if (responseStatus === 'fail') {
            status = 'rejected';
        }
        const stopPrice = this.safeNumber (order, 'stopPrice');
        return this.safeOrder ({
            'info': order,
            'id': this.safeStringN (order, [ 'id', 'orderId', 'newOrderId', 'cancelledOrderId' ]),
            'clientOrderId': this.safeString (order, 'clientOid'),
            'symbol': this.safeSymbol (marketId, market, '-'),
            'type': this.safeString (order, 'type'),
            'timeInForce': this.safeString (order, 'timeInForce'),
            'postOnly': this.safeBool (order, 'postOnly'),
            'side': this.safeString (order, 'side'),
            'amount': this.safeString (order, 'size'),
            'price': this.safeString (order, 'price'), // price is zero for market order, omitZero is called in safeOrder2
            'stopPrice': stopPrice,
            'triggerPrice': stopPrice,
            'cost': this.safeString (order, 'dealFunds'),
            'filled': this.safeString (order, 'dealSize'),
            'remaining': undefined,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'fee': {
                'currency': this.safeCurrencyCode (feeCurrencyId),
                'cost': this.safeNumber (order, 'fee'),
            },
            'status': status,
            'lastTradeTimestamp': undefined,
            'average': undefined,
            'trades': undefined,
        }, market);
    }

    async fetchOrderTrades (id: string, symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchOrderTrades
         * @description fetch all the trades made from a single order
         * @see https://docs.kucoin.com/#list-fills
         * @see https://docs.kucoin.com/spot-hf/#transaction-details
         * @param {string} id order id
         * @param {string} symbol unified market symbol
         * @param {int} [since] the earliest time in ms to fetch trades for
         * @param {int} [limit] the maximum number of trades to retrieve
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=trade-structure}
         */
        const request: Dict = {
            'orderId': id,
        };
        return await this.fetchMyTrades (symbol, since, limit, this.extend (request, params));
    }

    async fetchMyTrades (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchMyTrades
         * @see https://docs.kucoin.com/#list-fills
         * @see https://docs.kucoin.com/spot-hf/#transaction-details
         * @description fetch all trades made by the user
         * @param {string} symbol unified market symbol
         * @param {int} [since] the earliest time in ms to fetch trades for
         * @param {int} [limit] the maximum number of trades structures to retrieve
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {int} [params.until] the latest time in ms to fetch entries for
         * @param {bool} [params.hf] false, // true for hf order
         * @param {boolean} [params.paginate] default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the [availble parameters](https://github.com/ccxt/ccxt/wiki/Manual#pagination-params)
         * @returns {Trade[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=trade-structure}
         */
        await this.loadMarkets ();
        let paginate = false;
        [ paginate, params ] = this.handleOptionAndParams (params, 'fetchMyTrades', 'paginate');
        if (paginate) {
            return await this.fetchPaginatedCallDynamic ('fetchMyTrades', symbol, since, limit, params) as Trade[];
        }
        let request: Dict = {};
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        if (hf && symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchMyTrades() requires a symbol parameter for hf orders');
        }
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if (limit !== undefined) {
            request['pageSize'] = limit;
        }
        const method = this.options['fetchMyTradesMethod'];
        let parseResponseData = false;
        let response = undefined;
        [ request, params ] = this.handleUntilOption ('endAt', request, params);
        if (hf) {
            response = await this.privateGetHfFills (this.extend (request, params));
        } else if (method === 'private_get_fills') {
            // does not return trades earlier than 2019-02-18T00:00:00Z
            if (since !== undefined) {
                // only returns trades up to one week after the since param
                request['startAt'] = since;
            }
            response = await this.privateGetFills (this.extend (request, params));
        } else if (method === 'private_get_limit_fills') {
            // does not return trades earlier than 2019-02-18T00:00:00Z
            // takes no params
            // only returns first 1000 trades (not only "in the last 24 hours" as stated in the docs)
            parseResponseData = true;
            response = await this.privateGetLimitFills (this.extend (request, params));
        } else {
            throw new ExchangeError (this.id + ' fetchMyTradesMethod() invalid method');
        }
        //
        //     {
        //         "currentPage": 1,
        //         "pageSize": 50,
        //         "totalNum": 1,
        //         "totalPage": 1,
        //         "items": [
        //             {
        //                 "symbol":"BTC-USDT",       // symbol
        //                 "tradeId":"5c35c02709e4f67d5266954e",        // trade id
        //                 "orderId":"5c35c02703aa673ceec2a168",        // order id
        //                 "counterOrderId":"5c1ab46003aa676e487fa8e3", // counter order id
        //                 "side":"buy",              // transaction direction,include buy and sell
        //                 "liquidity":"taker",       // include taker and maker
        //                 "forceTaker":true,         // forced to become taker
        //                 "price":"0.083",           // order price
        //                 "size":"0.8424304",        // order quantity
        //                 "funds":"0.0699217232",    // order funds
        //                 "fee":"0",                 // fee
        //                 "feeRate":"0",             // fee rate
        //                 "feeCurrency":"USDT",      // charge fee currency
        //                 "stop":"",                 // stop type
        //                 "type":"limit",            // order type, e.g. limit, market, stop_limit.
        //                 "createdAt":1547026472000  // time
        //             },
        //             //------------------------------------------------------
        //             // v1 (historical) trade response structure
        //             {
        //                 "symbol": "SNOV-ETH",
        //                 "dealPrice": "0.0000246",
        //                 "dealValue": "0.018942",
        //                 "amount": "770",
        //                 "fee": "0.00001137",
        //                 "side": "sell",
        //                 "createdAt": 1540080199
        //                 "id":"5c4d389e4c8c60413f78e2e5",
        //             }
        //         ]
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        let trades = undefined;
        if (parseResponseData) {
            trades = data;
        } else {
            trades = this.safeList (data, 'items', []);
        }
        return this.parseTrades (trades, market, since, limit);
    }

    async fetchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        /**
         * @method
         * @name kucoin#fetchTrades
         * @description get the list of most recent trades for a particular symbol
         * @see https://www.kucoin.com/docs/rest/spot-trading/market-data/get-trade-histories
         * @param {string} symbol unified symbol of the market to fetch trades for
         * @param {int} [since] timestamp in ms of the earliest trade to fetch
         * @param {int} [limit] the maximum amount of trades to fetch
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {Trade[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=public-trades}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
        };
        // pagination is not supported on the exchange side anymore
        // if (since !== undefined) {
        //     request['startAt'] = Math.floor (since / 1000);
        // }
        // if (limit !== undefined) {
        //     request['pageSize'] = limit;
        // }
        const response = await this.publicGetMarketHistories (this.extend (request, params));
        //
        //     {
        //         "code": "200000",
        //         "data": [
        //             {
        //                 "sequence": "1548764654235",
        //                 "side": "sell",
        //                 "size":"0.6841354",
        //                 "price":"0.03202",
        //                 "time":1548848575203567174
        //             }
        //         ]
        //     }
        //
        const trades = this.safeList (response, 'data', []);
        return this.parseTrades (trades, market, since, limit);
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        //
        // fetchTrades (public)
        //
        //     {
        //         "sequence": "1548764654235",
        //         "side": "sell",
        //         "size":"0.6841354",
        //         "price":"0.03202",
        //         "time":1548848575203567174
        //     }
        //
        //     {
        //         "sequence": "1568787654360",
        //         "symbol": "BTC-USDT",
        //         "side": "buy",
        //         "size": "0.00536577",
        //         "price": "9345",
        //         "takerOrderId": "5e356c4a9f1a790008f8d921",
        //         "time": "1580559434436443257",
        //         "type": "match",
        //         "makerOrderId": "5e356bffedf0010008fa5d7f",
        //         "tradeId": "5e356c4aeefabd62c62a1ece"
        //     }
        //
        // fetchMyTrades (private) v2
        //
        //     {
        //         "symbol":"BTC-USDT",
        //         "tradeId":"5c35c02709e4f67d5266954e",
        //         "orderId":"5c35c02703aa673ceec2a168",
        //         "counterOrderId":"5c1ab46003aa676e487fa8e3",
        //         "side":"buy",
        //         "liquidity":"taker",
        //         "forceTaker":true,
        //         "price":"0.083",
        //         "size":"0.8424304",
        //         "funds":"0.0699217232",
        //         "fee":"0",
        //         "feeRate":"0",
        //         "feeCurrency":"USDT",
        //         "stop":"",
        //         "type":"limit",
        //         "createdAt":1547026472000
        //     }
        //
        // fetchMyTrades v2 alternative format since 2019-05-21 https://github.com/ccxt/ccxt/pull/5162
        //
        //     {
        //         "symbol": "OPEN-BTC",
        //         "forceTaker":  false,
        //         "orderId": "5ce36420054b4663b1fff2c9",
        //         "fee": "0",
        //         "feeCurrency": "",
        //         "type": "",
        //         "feeRate": "0",
        //         "createdAt": 1558417615000,
        //         "size": "12.8206",
        //         "stop": "",
        //         "price": "0",
        //         "funds": "0",
        //         "tradeId": "5ce390cf6e0db23b861c6e80"
        //     }
        //
        // fetchMyTrades (private) v1 (historical)
        //
        //     {
        //         "symbol": "SNOV-ETH",
        //         "dealPrice": "0.0000246",
        //         "dealValue": "0.018942",
        //         "amount": "770",
        //         "fee": "0.00001137",
        //         "side": "sell",
        //         "createdAt": 1540080199
        //         "id":"5c4d389e4c8c60413f78e2e5",
        //     }
        //
        const marketId = this.safeString (trade, 'symbol');
        market = this.safeMarket (marketId, market, '-');
        const id = this.safeString2 (trade, 'tradeId', 'id');
        const orderId = this.safeString (trade, 'orderId');
        const takerOrMaker = this.safeString (trade, 'liquidity');
        let timestamp = this.safeInteger (trade, 'time');
        if (timestamp !== undefined) {
            timestamp = this.parseToInt (timestamp / 1000000);
        } else {
            timestamp = this.safeInteger (trade, 'createdAt');
            // if it's a historical v1 trade, the exchange returns timestamp in seconds
            if (('dealValue' in trade) && (timestamp !== undefined)) {
                timestamp = timestamp * 1000;
            }
        }
        const priceString = this.safeString2 (trade, 'price', 'dealPrice');
        const amountString = this.safeString2 (trade, 'size', 'amount');
        const side = this.safeString (trade, 'side');
        let fee = undefined;
        const feeCostString = this.safeString (trade, 'fee');
        if (feeCostString !== undefined) {
            const feeCurrencyId = this.safeString (trade, 'feeCurrency');
            let feeCurrency = this.safeCurrencyCode (feeCurrencyId);
            if (feeCurrency === undefined) {
                feeCurrency = (side === 'sell') ? market['quote'] : market['base'];
            }
            fee = {
                'cost': feeCostString,
                'currency': feeCurrency,
                'rate': this.safeString (trade, 'feeRate'),
            };
        }
        let type = this.safeString (trade, 'type');
        if (type === 'match') {
            type = undefined;
        }
        const costString = this.safeString2 (trade, 'funds', 'dealValue');
        return this.safeTrade ({
            'info': trade,
            'id': id,
            'order': orderId,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': market['symbol'],
            'type': type,
            'takerOrMaker': takerOrMaker,
            'side': side,
            'price': priceString,
            'amount': amountString,
            'cost': costString,
            'fee': fee,
        }, market);
    }

    async fetchTradingFee (symbol: string, params = {}): Promise<TradingFeeInterface> {
        /**
         * @method
         * @name kucoin#fetchTradingFee
         * @description fetch the trading fees for a market
         * @see https://www.kucoin.com/docs/rest/funding/trade-fee/trading-pair-actual-fee-spot-margin-trade_hf
         * @param {string} symbol unified market symbol
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a [fee structure]{@link https://docs.ccxt.com/#/?id=fee-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request: Dict = {
            'symbols': market['id'],
        };
        const response = await this.privateGetTradeFees (this.extend (request, params));
        //
        //     {
        //         "code": "200000",
        //         "data": [
        //           {
        //             "symbol": "BTC-USDT",
        //             "takerFeeRate": "0.001",
        //             "makerFeeRate": "0.001"
        //           }
        //         ]
        //     }
        //
        const data = this.safeList (response, 'data', []);
        const first = this.safeDict (data, 0);
        const marketId = this.safeString (first, 'symbol');
        return {
            'info': response,
            'symbol': this.safeSymbol (marketId, market),
            'maker': this.safeNumber (first, 'makerFeeRate'),
            'taker': this.safeNumber (first, 'takerFeeRate'),
            'percentage': true,
            'tierBased': true,
        };
    }

    async withdraw (code: string, amount: number, address: string, tag = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#withdraw
         * @description make a withdrawal
         * @see https://www.kucoin.com/docs/rest/funding/withdrawals/apply-withdraw
         * @param {string} code unified currency code
         * @param {float} amount the amount to withdraw
         * @param {string} address the address to withdraw to
         * @param {string} tag
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a [transaction structure]{@link https://docs.ccxt.com/#/?id=transaction-structure}
         */
        [ tag, params ] = this.handleWithdrawTagAndParams (tag, params);
        await this.loadMarkets ();
        this.checkAddress (address);
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
            'address': address,
            // 'memo': tag,
            // 'isInner': false, // internal transfer or external withdrawal
            // 'remark': 'optional',
            // 'chain': 'OMNI', // 'ERC20', 'TRC20', default is ERC20, This only apply for multi-chain currency, and there is no need for single chain currency.
        };
        if (tag !== undefined) {
            request['memo'] = tag;
        }
        let networkCode = undefined;
        [ networkCode, params ] = this.handleNetworkCodeAndParams (params);
        if (networkCode !== undefined) {
            request['chain'] = this.networkCodeToId (networkCode).toLowerCase ();
        }
        await this.loadCurrencyPrecision (currency, networkCode);
        request['amount'] = this.currencyToPrecision (code, amount, networkCode);
        let includeFee = undefined;
        [ includeFee, params ] = this.handleOptionAndParams (params, 'withdraw', 'includeFee', false);
        if (includeFee) {
            request['feeDeductType'] = 'INTERNAL';
        }
        const response = await this.privatePostWithdrawals (this.extend (request, params));
        //
        // https://github.com/ccxt/ccxt/issues/5558
        //
        //     {
        //         "code":  200000,
        //         "data": {
        //             "withdrawalId":  "5bffb63303aa675e8bbe18f9"
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        return this.parseTransaction (data, currency);
    }

    async loadCurrencyPrecision (currency, networkCode: Str = undefined) {
        // as kucoin might not have network specific precisions defined in fetchCurrencies (because of webapi failure)
        // we should check and refetch precision once-per-instance for that specific currency & network
        // so avoids thorwing exceptions and burden to users
        // Note: this needs to be executed only if networkCode was provided
        if (networkCode !== undefined) {
            const networks = currency['networks'];
            const network = this.safeDict (networks, networkCode);
            if (this.safeNumber (network, 'precision') !== undefined) {
                // if precision exists, no need to refetch
                return;
            }
            // otherwise try to fetch and store in instance
            const request: Dict = {
                'currency': currency['id'],
                'chain': this.networkCodeToId (networkCode).toLowerCase (),
            };
            const response = await this.privateGetWithdrawalsQuotas (request);
            //
            //    {
            //        "code": "200000",
            //        "data": {
            //            "currency": "USDT",
            //            "limitBTCAmount": "14.24094850",
            //            "usedBTCAmount": "0.00000000",
            //            "quotaCurrency": "USDT",
            //            "limitQuotaCurrencyAmount": "999999.00000000",
            //            "usedQuotaCurrencyAmount": "0",
            //            "remainAmount": "999999.0000",
            //            "availableAmount": "10.77545071",
            //            "withdrawMinFee": "1",
            //            "innerWithdrawMinFee": "0",
            //            "withdrawMinSize": "10",
            //            "isWithdrawEnabled": true,
            //            "precision": 4,
            //            "chain": "EOS",
            //            "reason": null,
            //            "lockedAmount": "0"
            //        }
            //    }
            //
            const data = this.safeDict (response, 'data', {});
            const precision = this.parseNumber (this.parsePrecision (this.safeString (data, 'precision')));
            const code = currency['code'];
            this.currencies[code]['networks'][networkCode]['precision'] = precision;
        }
    }

    parseTransactionStatus (status: Str) {
        const statuses: Dict = {
            'SUCCESS': 'ok',
            'PROCESSING': 'pending',
            'WALLET_PROCESSING': 'pending',
            'FAILURE': 'failed',
        };
        return this.safeString (statuses, status, status);
    }

    parseTransaction (transaction: Dict, currency: Currency = undefined): Transaction {
        //
        // fetchDeposits
        //
        //     {
        //         "address": "0x5f047b29041bcfdbf0e4478cdfa753a336ba6989",
        //         "memo": "5c247c8a03aa677cea2a251d",
        //         "amount": 1,
        //         "fee": 0.0001,
        //         "currency": "KCS",
        //         "chain": "",
        //         "isInner": false,
        //         "walletTxId": "5bbb57386d99522d9f954c5a@test004",
        //         "status": "SUCCESS",
        //         "createdAt": 1544178843000,
        //         "updatedAt": 1544178891000
        //         "remark":"foobar"
        //     }
        //
        // fetchWithdrawals
        //
        //     {
        //         "id": "5c2dc64e03aa675aa263f1ac",
        //         "address": "0x5bedb060b8eb8d823e2414d82acce78d38be7fe9",
        //         "memo": "",
        //         "currency": "ETH",
        //         "chain": "",
        //         "amount": 1.0000000,
        //         "fee": 0.0100000,
        //         "walletTxId": "3e2414d82acce78d38be7fe9",
        //         "isInner": false,
        //         "status": "FAILURE",
        //         "createdAt": 1546503758000,
        //         "updatedAt": 1546504603000
        //         "remark":"foobar"
        //     }
        //
        // withdraw
        //
        //     {
        //         "withdrawalId":  "5bffb63303aa675e8bbe18f9"
        //     }
        //
        const currencyId = this.safeString (transaction, 'currency');
        const code = this.safeCurrencyCode (currencyId, currency);
        let address = this.safeString (transaction, 'address');
        const amount = this.safeString (transaction, 'amount');
        let txid = this.safeString (transaction, 'walletTxId');
        if (txid !== undefined) {
            const txidParts = txid.split ('@');
            const numTxidParts = txidParts.length;
            if (numTxidParts > 1) {
                if (address === undefined) {
                    if (txidParts[1].length > 1) {
                        address = txidParts[1];
                    }
                }
            }
            txid = txidParts[0];
        }
        let type = (txid === undefined) ? 'withdrawal' : 'deposit';
        const rawStatus = this.safeString (transaction, 'status');
        let fee = undefined;
        const feeCost = this.safeString (transaction, 'fee');
        if (feeCost !== undefined) {
            let rate = undefined;
            if (amount !== undefined) {
                rate = Precise.stringDiv (feeCost, amount);
            }
            fee = {
                'cost': this.parseNumber (feeCost),
                'rate': this.parseNumber (rate),
                'currency': code,
            };
        }
        let timestamp = this.safeInteger2 (transaction, 'createdAt', 'createAt');
        let updated = this.safeInteger (transaction, 'updatedAt');
        const isV1 = !('createdAt' in transaction);
        // if it's a v1 structure
        if (isV1) {
            type = ('address' in transaction) ? 'withdrawal' : 'deposit';
            if (timestamp !== undefined) {
                timestamp = timestamp * 1000;
            }
            if (updated !== undefined) {
                updated = updated * 1000;
            }
        }
        const internal = this.safeBool (transaction, 'isInner');
        const tag = this.safeString (transaction, 'memo');
        return {
            'info': transaction,
            'id': this.safeString2 (transaction, 'id', 'withdrawalId'),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'network': this.networkIdToCode (this.safeString (transaction, 'chain')),
            'address': address,
            'addressTo': address,
            'addressFrom': undefined,
            'tag': tag,
            'tagTo': tag,
            'tagFrom': undefined,
            'currency': code,
            'amount': this.parseNumber (amount),
            'txid': txid,
            'type': type,
            'status': this.parseTransactionStatus (rawStatus),
            'comment': this.safeString (transaction, 'remark'),
            'internal': internal,
            'fee': fee,
            'updated': updated,
        };
    }

    async fetchDeposits (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Transaction[]> {
        /**
         * @method
         * @name kucoin#fetchDeposits
         * @description fetch all deposits made to an account
         * @see https://www.kucoin.com/docs/rest/funding/deposit/get-deposit-list
         * @see https://www.kucoin.com/docs/rest/funding/deposit/get-v1-historical-deposits-list
         * @param {string} code unified currency code
         * @param {int} [since] the earliest time in ms to fetch deposits for
         * @param {int} [limit] the maximum number of deposits structures to retrieve
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {int} [params.until] the latest time in ms to fetch entries for
         * @param {boolean} [params.paginate] default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the [availble parameters](https://github.com/ccxt/ccxt/wiki/Manual#pagination-params)
         * @returns {object[]} a list of [transaction structures]{@link https://docs.ccxt.com/#/?id=transaction-structure}
         */
        await this.loadMarkets ();
        let paginate = false;
        [ paginate, params ] = this.handleOptionAndParams (params, 'fetchDeposits', 'paginate');
        if (paginate) {
            return await this.fetchPaginatedCallDynamic ('fetchDeposits', code, since, limit, params);
        }
        let request: Dict = {};
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
            request['currency'] = currency['id'];
        }
        if (limit !== undefined) {
            request['pageSize'] = limit;
        }
        [ request, params ] = this.handleUntilOption ('endAt', request, params);
        let response = undefined;
        if (since !== undefined && since < 1550448000000) {
            // if since is earlier than 2019-02-18T00:00:00Z
            request['startAt'] = this.parseToInt (since / 1000);
            response = await this.privateGetHistDeposits (this.extend (request, params));
        } else {
            if (since !== undefined) {
                request['startAt'] = since;
            }
            response = await this.privateGetDeposits (this.extend (request, params));
        }
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "currentPage": 1,
        //             "pageSize": 5,
        //             "totalNum": 2,
        //             "totalPage": 1,
        //             "items": [
        //                 //--------------------------------------------------
        //                 // version 2 deposit response structure
        //                 {
        //                     "address": "0x5f047b29041bcfdbf0e4478cdfa753a336ba6989",
        //                     "memo": "5c247c8a03aa677cea2a251d",
        //                     "amount": 1,
        //                     "fee": 0.0001,
        //                     "currency": "KCS",
        //                     "isInner": false,
        //                     "walletTxId": "5bbb57386d99522d9f954c5a@test004",
        //                     "status": "SUCCESS",
        //                     "createdAt": 1544178843000,
        //                     "updatedAt": 1544178891000
        //                     "remark":"foobar"
        //                 },
        //                 //--------------------------------------------------
        //                 // version 1 (historical) deposit response structure
        //                 {
        //                     "currency": "BTC",
        //                     "createAt": 1528536998,
        //                     "amount": "0.03266638",
        //                     "walletTxId": "55c643bc2c68d6f17266383ac1be9e454038864b929ae7cee0bc408cc5c869e8@12ffGWmMMD1zA1WbFm7Ho3JZ1w6NYXjpFk@234",
        //                     "isInner": false,
        //                     "status": "SUCCESS",
        //                 }
        //             ]
        //         }
        //     }
        //
        const responseData = response['data']['items'];
        return this.parseTransactions (responseData, currency, since, limit, { 'type': 'deposit' });
    }

    async fetchWithdrawals (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Transaction[]> {
        /**
         * @method
         * @name kucoin#fetchWithdrawals
         * @description fetch all withdrawals made from an account
         * @see https://www.kucoin.com/docs/rest/funding/withdrawals/get-withdrawals-list
         * @see https://www.kucoin.com/docs/rest/funding/withdrawals/get-v1-historical-withdrawals-list
         * @param {string} code unified currency code
         * @param {int} [since] the earliest time in ms to fetch withdrawals for
         * @param {int} [limit] the maximum number of withdrawals structures to retrieve
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {int} [params.until] the latest time in ms to fetch entries for
         * @param {boolean} [params.paginate] default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the [availble parameters](https://github.com/ccxt/ccxt/wiki/Manual#pagination-params)
         * @returns {object[]} a list of [transaction structures]{@link https://docs.ccxt.com/#/?id=transaction-structure}
         */
        await this.loadMarkets ();
        let paginate = false;
        [ paginate, params ] = this.handleOptionAndParams (params, 'fetchWithdrawals', 'paginate');
        if (paginate) {
            return await this.fetchPaginatedCallDynamic ('fetchWithdrawals', code, since, limit, params);
        }
        let request: Dict = {};
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
            request['currency'] = currency['id'];
        }
        if (limit !== undefined) {
            request['pageSize'] = limit;
        }
        [ request, params ] = this.handleUntilOption ('endAt', request, params);
        let response = undefined;
        if (since !== undefined && since < 1550448000000) {
            // if since is earlier than 2019-02-18T00:00:00Z
            request['startAt'] = this.parseToInt (since / 1000);
            response = await this.privateGetHistWithdrawals (this.extend (request, params));
        } else {
            if (since !== undefined) {
                request['startAt'] = since;
            }
            response = await this.privateGetWithdrawals (this.extend (request, params));
        }
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "currentPage": 1,
        //             "pageSize": 5,
        //             "totalNum": 2,
        //             "totalPage": 1,
        //             "items": [
        //                 //--------------------------------------------------
        //                 // version 2 withdrawal response structure
        //                 {
        //                     "id": "5c2dc64e03aa675aa263f1ac",
        //                     "address": "0x5bedb060b8eb8d823e2414d82acce78d38be7fe9",
        //                     "memo": "",
        //                     "currency": "ETH",
        //                     "amount": 1.0000000,
        //                     "fee": 0.0100000,
        //                     "walletTxId": "3e2414d82acce78d38be7fe9",
        //                     "isInner": false,
        //                     "status": "FAILURE",
        //                     "createdAt": 1546503758000,
        //                     "updatedAt": 1546504603000
        //                 },
        //                 //--------------------------------------------------
        //                 // version 1 (historical) withdrawal response structure
        //                 {
        //                     "currency": "BTC",
        //                     "createAt": 1526723468,
        //                     "amount": "0.534",
        //                     "address": "33xW37ZSW4tQvg443Pc7NLCAs167Yc2XUV",
        //                     "walletTxId": "aeacea864c020acf58e51606169240e96774838dcd4f7ce48acf38e3651323f4",
        //                     "isInner": false,
        //                     "status": "SUCCESS"
        //                 }
        //             ]
        //         }
        //     }
        //
        const responseData = response['data']['items'];
        return this.parseTransactions (responseData, currency, since, limit, { 'type': 'withdrawal' });
    }

    parseBalanceHelper (entry) {
        const account = this.account ();
        account['used'] = this.safeString2 (entry, 'holdBalance', 'hold');
        account['free'] = this.safeString2 (entry, 'availableBalance', 'available');
        account['total'] = this.safeString2 (entry, 'totalBalance', 'total');
        const debt = this.safeString (entry, 'liability');
        const interest = this.safeString (entry, 'interest');
        account['debt'] = Precise.stringAdd (debt, interest);
        return account;
    }

    async fetchBalance (params = {}): Promise<Balances> {
        /**
         * @method
         * @name kucoin#fetchBalance
         * @description query for balance and get the amount of funds available for trading or funds locked in orders
         * @see https://www.kucoin.com/docs/rest/account/basic-info/get-account-list-spot-margin-trade_hf
         * @see https://www.kucoin.com/docs/rest/funding/funding-overview/get-account-detail-margin
         * @see https://www.kucoin.com/docs/rest/funding/funding-overview/get-account-detail-isolated-margin
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {object} [params.marginMode] 'cross' or 'isolated', margin type for fetching margin balance
         * @param {object} [params.type] extra parameters specific to the exchange API endpoint
         * @param {object} [params.hf] *default if false* if true, the result includes the balance of the high frequency account
         * @returns {object} a [balance structure]{@link https://docs.ccxt.com/#/?id=balance-structure}
         */
        await this.loadMarkets ();
        const code = this.safeString (params, 'code');
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
        }
        const defaultType = this.safeString2 (this.options, 'fetchBalance', 'defaultType', 'spot');
        const requestedType = this.safeString (params, 'type', defaultType);
        const accountsByType = this.safeDict (this.options, 'accountsByType');
        let type = this.safeString (accountsByType, requestedType, requestedType);
        params = this.omit (params, 'type');
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        if (hf) {
            type = 'trade_hf';
        }
        const [ marginMode, query ] = this.handleMarginModeAndParams ('fetchBalance', params);
        let response = undefined;
        const request: Dict = {};
        const isolated = (marginMode === 'isolated') || (type === 'isolated');
        const cross = (marginMode === 'cross') || (type === 'margin');
        if (isolated) {
            if (currency !== undefined) {
                request['balanceCurrency'] = currency['id'];
            }
            response = await this.privateGetIsolatedAccounts (this.extend (request, query));
        } else if (cross) {
            response = await this.privateGetMarginAccount (this.extend (request, query));
        } else {
            if (currency !== undefined) {
                request['currency'] = currency['id'];
            }
            request['type'] = type;
            response = await this.privateGetAccounts (this.extend (request, query));
        }
        //
        // Spot
        //
        //    {
        //        "code": "200000",
        //        "data": [
        //            {
        //                "balance": "0.00009788",
        //                "available": "0.00009788",
        //                "holds": "0",
        //                "currency": "BTC",
        //                "id": "5c6a4fd399a1d81c4f9cc4d0",
        //                "type": "trade",
        //            },
        //        ]
        //    }
        //
        // Cross
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "debtRatio": "0",
        //             "accounts": [
        //                 {
        //                     "currency": "USDT",
        //                     "totalBalance": "5",
        //                     "availableBalance": "5",
        //                     "holdBalance": "0",
        //                     "liability": "0",
        //                     "maxBorrowSize": "20"
        //                 },
        //             ]
        //         }
        //     }
        //
        // Isolated
        //
        //    {
        //        "code": "200000",
        //        "data": {
        //            "totalAssetOfQuoteCurrency": "0",
        //            "totalLiabilityOfQuoteCurrency": "0",
        //            "timestamp": 1712085661155,
        //            "assets": [
        //                {
        //                    "symbol": "MANA-USDT",
        //                    "status": "EFFECTIVE",
        //                    "debtRatio": "0",
        //                    "baseAsset": {
        //                        "currency": "MANA",
        //                        "borrowEnabled": true,
        //                        "transferInEnabled": true,
        //                        "total": "0",
        //                        "hold": "0",
        //                        "available": "0",
        //                        "liability": "0",
        //                        "interest": "0",
        //                        "maxBorrowSize": "0"
        //                    },
        //                    "quoteAsset": {
        //                        "currency": "USDT",
        //                        "borrowEnabled": true,
        //                        "transferInEnabled": true,
        //                        "total": "0",
        //                        "hold": "0",
        //                        "available": "0",
        //                        "liability": "0",
        //                        "interest": "0",
        //                        "maxBorrowSize": "0"
        //                    }
        //                },
        //                ...
        //            ]
        //        }
        //    }
        //
        let data = undefined;
        const result: Dict = {
            'info': response,
            'timestamp': undefined,
            'datetime': undefined,
        };
        if (isolated) {
            data = this.safeDict (response, 'data', {});
            const assets = this.safeValue (data, 'assets', data);
            for (let i = 0; i < assets.length; i++) {
                const entry = assets[i];
                const marketId = this.safeString (entry, 'symbol');
                const symbol = this.safeSymbol (marketId, undefined, '_');
                const base = this.safeDict (entry, 'baseAsset', {});
                const quote = this.safeDict (entry, 'quoteAsset', {});
                const baseCode = this.safeCurrencyCode (this.safeString (base, 'currency'));
                const quoteCode = this.safeCurrencyCode (this.safeString (quote, 'currency'));
                const subResult: Dict = {};
                subResult[baseCode] = this.parseBalanceHelper (base);
                subResult[quoteCode] = this.parseBalanceHelper (quote);
                result[symbol] = this.safeBalance (subResult);
            }
        } else if (cross) {
            data = this.safeDict (response, 'data', {});
            const accounts = this.safeList (data, 'accounts', []);
            for (let i = 0; i < accounts.length; i++) {
                const balance = accounts[i];
                const currencyId = this.safeString (balance, 'currency');
                const codeInner = this.safeCurrencyCode (currencyId);
                result[codeInner] = this.parseBalanceHelper (balance);
            }
        } else {
            data = this.safeList (response, 'data', []);
            for (let i = 0; i < data.length; i++) {
                const balance = data[i];
                const balanceType = this.safeString (balance, 'type');
                if (balanceType === type) {
                    const currencyId = this.safeString (balance, 'currency');
                    const codeInner2 = this.safeCurrencyCode (currencyId);
                    const account = this.account ();
                    account['total'] = this.safeString (balance, 'balance');
                    account['free'] = this.safeString (balance, 'available');
                    account['used'] = this.safeString (balance, 'holds');
                    result[codeInner2] = account;
                }
            }
        }
        const returnType = isolated ? result : this.safeBalance (result);
        return returnType as Balances;
    }

    async transfer (code: string, amount: number, fromAccount: string, toAccount:string, params = {}): Promise<TransferEntry> {
        /**
         * @method
         * @name kucoin#transfer
         * @description transfer currency internally between wallets on the same account
         * @see https://www.kucoin.com/docs/rest/funding/transfer/inner-transfer
         * @see https://docs.kucoin.com/futures/#transfer-funds-to-kucoin-main-account-2
         * @see https://docs.kucoin.com/spot-hf/#internal-funds-transfers-in-high-frequency-trading-accounts
         * @param {string} code unified currency code
         * @param {float} amount amount to transfer
         * @param {string} fromAccount account to transfer from
         * @param {string} toAccount account to transfer to
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a [transfer structure]{@link https://docs.ccxt.com/#/?id=transfer-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const requestedAmount = this.currencyToPrecision (code, amount);
        let fromId = this.convertTypeToAccount (fromAccount);
        let toId = this.convertTypeToAccount (toAccount);
        const fromIsolated = this.inArray (fromId, this.ids);
        const toIsolated = this.inArray (toId, this.ids);
        if (fromId === 'contract') {
            if (toId !== 'main') {
                throw new ExchangeError (this.id + ' transfer() only supports transferring from futures account to main account');
            }
            const request: Dict = {
                'currency': currency['id'],
                'amount': requestedAmount,
            };
            if (!('bizNo' in params)) {
                // it doesn't like more than 24 characters
                request['bizNo'] = this.uuid22 ();
            }
            const response = await this.futuresPrivatePostTransferOut (this.extend (request, params));
            //
            //     {
            //         "code": "200000",
            //         "data": {
            //             "applyId": "605a87217dff1500063d485d",
            //             "bizNo": "bcd6e5e1291f4905af84dc",
            //             "payAccountType": "CONTRACT",
            //             "payTag": "DEFAULT",
            //             "remark": '',
            //             "recAccountType": "MAIN",
            //             "recTag": "DEFAULT",
            //             "recRemark": '',
            //             "recSystem": "KUCOIN",
            //             "status": "PROCESSING",
            //             "currency": "XBT",
            //             "amount": "0.00001",
            //             "fee": "0",
            //             "sn": "573688685663948",
            //             "reason": '',
            //             "createdAt": 1616545569000,
            //             "updatedAt": 1616545569000
            //         }
            //     }
            //
            const data = this.safeDict (response, 'data');
            return this.parseTransfer (data, currency);
        } else {
            const request: Dict = {
                'currency': currency['id'],
                'amount': requestedAmount,
            };
            if (fromIsolated || toIsolated) {
                if (this.inArray (fromId, this.ids)) {
                    request['fromTag'] = fromId;
                    fromId = 'isolated';
                }
                if (this.inArray (toId, this.ids)) {
                    request['toTag'] = toId;
                    toId = 'isolated';
                }
            }
            request['from'] = fromId;
            request['to'] = toId;
            if (!('clientOid' in params)) {
                request['clientOid'] = this.uuid ();
            }
            const response = await this.privatePostAccountsInnerTransfer (this.extend (request, params));
            //
            //     {
            //         "code": "200000",
            //         "data": {
            //              "orderId": "605a6211e657f00006ad0ad6"
            //         }
            //     }
            //
            const data = this.safeDict (response, 'data');
            return this.parseTransfer (data, currency);
        }
    }

    parseTransfer (transfer: Dict, currency: Currency = undefined): TransferEntry {
        //
        // transfer (spot)
        //
        //    {
        //        "orderId": "605a6211e657f00006ad0ad6"
        //    }
        //
        //    {
        //        "code": "200000",
        //        "msg": "Failed to transfer out. The amount exceeds the upper limit"
        //    }
        //
        // transfer (futures)
        //
        //     {
        //         "applyId": "605a87217dff1500063d485d",
        //         "bizNo": "bcd6e5e1291f4905af84dc",
        //         "payAccountType": "CONTRACT",
        //         "payTag": "DEFAULT",
        //         "remark": '',
        //         "recAccountType": "MAIN",
        //         "recTag": "DEFAULT",
        //         "recRemark": '',
        //         "recSystem": "KUCOIN",
        //         "status": "PROCESSING",
        //         "currency": "XBT",
        //         "amount": "0.00001",
        //         "fee": "0",
        //         "sn": "573688685663948",
        //         "reason": '',
        //         "createdAt": 1616545569000,
        //         "updatedAt": 1616545569000
        //     }
        //
        const timestamp = this.safeInteger (transfer, 'createdAt');
        const currencyId = this.safeString (transfer, 'currency');
        const rawStatus = this.safeString (transfer, 'status');
        const accountFromRaw = this.safeStringLower (transfer, 'payAccountType');
        const accountToRaw = this.safeStringLower (transfer, 'recAccountType');
        const accountsByType = this.safeDict (this.options, 'accountsByType');
        const accountFrom = this.safeString (accountsByType, accountFromRaw, accountFromRaw);
        const accountTo = this.safeString (accountsByType, accountToRaw, accountToRaw);
        return {
            'id': this.safeString2 (transfer, 'applyId', 'orderId'),
            'currency': this.safeCurrencyCode (currencyId, currency),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'amount': this.safeNumber (transfer, 'amount'),
            'fromAccount': accountFrom,
            'toAccount': accountTo,
            'status': this.parseTransferStatus (rawStatus),
            'info': transfer,
        };
    }

    parseTransferStatus (status: Str): Str {
        const statuses: Dict = {
            'PROCESSING': 'pending',
        };
        return this.safeString (statuses, status, status);
    }

    parseLedgerEntryType (type) {
        const types: Dict = {
            'Assets Transferred in After Upgrading': 'transfer', // Assets Transferred in After V1 to V2 Upgrading
            'Deposit': 'transaction', // Deposit
            'Withdrawal': 'transaction', // Withdrawal
            'Transfer': 'transfer', // Transfer
            'Trade_Exchange': 'trade', // Trade
            // 'Vote for Coin': 'Vote for Coin', // Vote for Coin
            'KuCoin Bonus': 'bonus', // KuCoin Bonus
            'Referral Bonus': 'referral', // Referral Bonus
            'Rewards': 'bonus', // Activities Rewards
            // 'Distribution': 'Distribution', // Distribution, such as get GAS by holding NEO
            'Airdrop/Fork': 'airdrop', // Airdrop/Fork
            'Other rewards': 'bonus', // Other rewards, except Vote, Airdrop, Fork
            'Fee Rebate': 'rebate', // Fee Rebate
            'Buy Crypto': 'trade', // Use credit card to buy crypto
            'Sell Crypto': 'sell', // Use credit card to sell crypto
            'Public Offering Purchase': 'trade', // Public Offering Purchase for Spotlight
            // 'Send red envelope': 'Send red envelope', // Send red envelope
            // 'Open red envelope': 'Open red envelope', // Open red envelope
            // 'Staking': 'Staking', // Staking
            // 'LockDrop Vesting': 'LockDrop Vesting', // LockDrop Vesting
            // 'Staking Profits': 'Staking Profits', // Staking Profits
            // 'Redemption': 'Redemption', // Redemption
            'Refunded Fees': 'fee', // Refunded Fees
            'KCS Pay Fees': 'fee', // KCS Pay Fees
            'Margin Trade': 'trade', // Margin Trade
            'Loans': 'Loans', // Loans
            // 'Borrowings': 'Borrowings', // Borrowings
            // 'Debt Repayment': 'Debt Repayment', // Debt Repayment
            // 'Loans Repaid': 'Loans Repaid', // Loans Repaid
            // 'Lendings': 'Lendings', // Lendings
            // 'Pool transactions': 'Pool transactions', // Pool-X transactions
            'Instant Exchange': 'trade', // Instant Exchange
            'Sub-account transfer': 'transfer', // Sub-account transfer
            'Liquidation Fees': 'fee', // Liquidation Fees
            // 'Soft Staking Profits': 'Soft Staking Profits', // Soft Staking Profits
            // 'Voting Earnings': 'Voting Earnings', // Voting Earnings on Pool-X
            // 'Redemption of Voting': 'Redemption of Voting', // Redemption of Voting on Pool-X
            // 'Voting': 'Voting', // Voting on Pool-X
            // 'Convert to KCS': 'Convert to KCS', // Convert to KCS
        };
        return this.safeString (types, type, type);
    }

    parseLedgerEntry (item: Dict, currency: Currency = undefined) {
        //
        //     {
        //         "id": "611a1e7c6a053300067a88d9", //unique key for each ledger entry
        //         "currency": "USDT", //Currency
        //         "amount": "10.00059547", //The total amount of assets (fees included) involved in assets changes such as transaction, withdrawal and bonus distribution.
        //         "fee": "0", //Deposit or withdrawal fee
        //         "balance": "0", //Total assets of a currency remaining funds after transaction
        //         "accountType": "MAIN", //Account Type
        //         "bizType": "Loans Repaid", //business type
        //         "direction": "in", //side, in or out
        //         "createdAt": 1629101692950, //Creation time
        //         "context": "{\"borrowerUserId\":\"601ad03e50dc810006d242ea\",\"loanRepayDetailNo\":\"611a1e7cc913d000066cf7ec\"}" //Business core parameters
        //     }
        //
        const id = this.safeString (item, 'id');
        const currencyId = this.safeString (item, 'currency');
        const code = this.safeCurrencyCode (currencyId, currency);
        const amount = this.safeNumber (item, 'amount');
        const balanceAfter = undefined;
        // const balanceAfter = this.safeNumber (item, 'balance'); only returns zero string
        const bizType = this.safeString (item, 'bizType');
        const type = this.parseLedgerEntryType (bizType);
        const direction = this.safeString (item, 'direction');
        const timestamp = this.safeInteger (item, 'createdAt');
        const datetime = this.iso8601 (timestamp);
        const account = this.safeString (item, 'accountType'); // MAIN, TRADE, MARGIN, or CONTRACT
        const context = this.safeString (item, 'context'); // contains other information about the ledger entry
        //
        // withdrawal transaction
        //
        //     "{\"orderId\":\"617bb2d09e7b3b000196dac8\",\"txId\":\"0x79bb9855f86b351a45cab4dc69d78ca09586a94c45dde49475722b98f401b054\"}"
        //
        // deposit to MAIN, trade via MAIN
        //
        //     "{\"orderId\":\"617ab9949e7b3b0001948081\",\"txId\":\"0x7a06b16bbd6b03dbc3d96df5683b15229fc35e7184fd7179a5f3a310bd67d1fa@default@0\"}"
        //
        // sell trade
        //
        //     "{\"symbol\":\"ETH-USDT\",\"orderId\":\"617adcd1eb3fa20001dd29a1\",\"tradeId\":\"617adcd12e113d2b91222ff9\"}"
        //
        let referenceId = undefined;
        if (context !== undefined && context !== '') {
            try {
                const parsed = JSON.parse (context);
                const orderId = this.safeString (parsed, 'orderId');
                const tradeId = this.safeString (parsed, 'tradeId');
                // transactions only have an orderId but for trades we wish to use tradeId
                if (tradeId !== undefined) {
                    referenceId = tradeId;
                } else {
                    referenceId = orderId;
                }
            } catch (exc) {
                referenceId = context;
            }
        }
        let fee = undefined;
        const feeCost = this.safeString (item, 'fee');
        let feeCurrency = undefined;
        if (feeCost !== '0') {
            feeCurrency = code;
            fee = { 'cost': this.parseNumber (feeCost), 'currency': feeCurrency };
        }
        return {
            'id': id,
            'direction': direction,
            'account': account,
            'referenceId': referenceId,
            'referenceAccount': account,
            'type': type,
            'currency': code,
            'amount': amount,
            'timestamp': timestamp,
            'datetime': datetime,
            'before': undefined,
            'after': balanceAfter, // undefined
            'status': undefined,
            'fee': fee,
            'info': item,
        };
    }

    async fetchLedger (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchLedger
         * @see https://www.kucoin.com/docs/rest/account/basic-info/get-account-ledgers-spot-margin
         * @see https://www.kucoin.com/docs/rest/account/basic-info/get-account-ledgers-trade_hf
         * @see https://www.kucoin.com/docs/rest/account/basic-info/get-account-ledgers-margin_hf
         * @description fetch the history of changes, actions done by the user or operations that altered balance of the user
         * @param {string} code unified currency code, default is undefined
         * @param {int} [since] timestamp in ms of the earliest ledger entry, default is undefined
         * @param {int} [limit] max number of ledger entrys to return, default is undefined
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {boolean} [params.hf] default false, when true will fetch ledger entries for the high frequency trading account
         * @param {int} [params.until] the latest time in ms to fetch entries for
         * @param {boolean} [params.paginate] default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the [availble parameters](https://github.com/ccxt/ccxt/wiki/Manual#pagination-params)
         * @returns {object} a [ledger structure]{@link https://docs.ccxt.com/#/?id=ledger-structure}
         */
        await this.loadMarkets ();
        await this.loadAccounts ();
        let paginate = false;
        [ paginate, params ] = this.handleOptionAndParams (params, 'fetchLedger', 'paginate');
        let hf = undefined;
        [ hf, params ] = await this.handleHfAndParams (params);
        if (paginate) {
            return await this.fetchPaginatedCallDynamic ('fetchLedger', code, since, limit, params);
        }
        let request: Dict = {
            // 'currency': currency['id'], // can choose up to 10, if not provided returns for all currencies by default
            // 'direction': 'in', // 'out'
            // 'bizType': 'DEPOSIT', // DEPOSIT, WITHDRAW, TRANSFER, SUB_TRANSFER,TRADE_EXCHANGE, MARGIN_EXCHANGE, KUCOIN_BONUS (optional)
            // 'startAt': since,
            // 'endAt': exchange.milliseconds (),
        };
        if (since !== undefined) {
            request['startAt'] = since;
        }
        // atm only single currency retrieval is supported
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
            request['currency'] = currency['id'];
        }
        [ request, params ] = this.handleUntilOption ('endAt', request, params);
        let marginMode = undefined;
        [ marginMode, params ] = this.handleMarginModeAndParams ('fetchLedger', params);
        let response = undefined;
        if (hf) {
            if (marginMode !== undefined) {
                response = await this.privateGetHfMarginAccountLedgers (this.extend (request, params));
            } else {
                response = await this.privateGetHfAccountsLedgers (this.extend (request, params));
            }
        } else {
            response = await this.privateGetAccountsLedgers (this.extend (request, params));
        }
        //
        //     {
        //         "code":"200000",
        //         "data":{
        //             "currentPage":1,
        //             "pageSize":50,
        //             "totalNum":1,
        //             "totalPage":1,
        //             "items":[
        //                 {
        //                     "id":"617cc528729f5f0001c03ceb",
        //                     "currency":"GAS",
        //                     "amount":"0.00000339",
        //                     "fee":"0",
        //                     "balance":"0",
        //                     "accountType":"MAIN",
        //                     "bizType":"Distribution",
        //                     "direction":"in",
        //                     "createdAt":1635566888183,
        //                     "context":"{\"orderId\":\"617cc47a1c47ed0001ce3606\",\"description\":\"Holding NEO,distribute GAS(2021/10/30)\"}"
        //                 }
        //                 {
        //                     "id": "611a1e7c6a053300067a88d9",//unique key
        //                     "currency": "USDT", //Currency
        //                     "amount": "10.00059547", //Change amount of the funds
        //                     "fee": "0", //Deposit or withdrawal fee
        //                     "balance": "0", //Total assets of a currency
        //                     "accountType": "MAIN", //Account Type
        //                     "bizType": "Loans Repaid", //business type
        //                     "direction": "in", //side, in or out
        //                     "createdAt": 1629101692950, //Creation time
        //                     "context": "{\"borrowerUserId\":\"601ad03e50dc810006d242ea\",\"loanRepayDetailNo\":\"611a1e7cc913d000066cf7ec\"}"
        //                 },
        //             ]
        //         }
        //     }
        //
        const dataList = this.safeList (response, 'data');
        if (dataList !== undefined) {
            return this.parseLedger (dataList, currency, since, limit);
        }
        const data = this.safeDict (response, 'data');
        const items = this.safeList (data, 'items', []);
        return this.parseLedger (items, currency, since, limit);
    }

    calculateRateLimiterCost (api, method, path, params, config = {}) {
        const versions = this.safeDict (this.options, 'versions', {});
        const apiVersions = this.safeDict (versions, api, {});
        const methodVersions = this.safeDict (apiVersions, method, {});
        const defaultVersion = this.safeString (methodVersions, path, this.options['version']);
        const version = this.safeString (params, 'version', defaultVersion);
        if (version === 'v3' && ('v3' in config)) {
            return config['v3'];
        } else if (version === 'v2' && ('v2' in config)) {
            return config['v2'];
        } else if (version === 'v1' && ('v1' in config)) {
            return config['v1'];
        }
        return this.safeValue (config, 'cost', 1);
    }

    parseBorrowRateHistory (response, code, since, limit) {
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const item = response[i];
            const borrowRate = this.parseBorrowRate (item);
            result.push (borrowRate);
        }
        const sorted = this.sortBy (result, 'timestamp');
        return this.filterByCurrencySinceLimit (sorted, code, since, limit);
    }

    parseBorrowRate (info, currency: Currency = undefined) {
        //
        //     {
        //         "tradeId": "62db2dcaff219600012b56cd",
        //         "currency": "USDT",
        //         "size": "10",
        //         "dailyIntRate": "0.00003",
        //         "term": 7,
        //         "timestamp": 1658531274508488480
        //     },
        //
        //     {
        //         "createdAt": 1697783812257,
        //         "currency": "XMR",
        //         "interestAmount": "0.1",
        //         "dayRatio": "0.001"
        //     }
        //
        const timestampId = this.safeString2 (info, 'createdAt', 'timestamp');
        const timestamp = this.parseToInt (timestampId.slice (0, 13));
        const currencyId = this.safeString (info, 'currency');
        return {
            'currency': this.safeCurrencyCode (currencyId, currency),
            'rate': this.safeNumber2 (info, 'dailyIntRate', 'dayRatio'),
            'period': 86400000,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'info': info,
        };
    }

    async fetchBorrowInterest (code: Str = undefined, symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchBorrowInterest
         * @description fetch the interest owed by the user for borrowing currency for margin trading
         * @see https://docs.kucoin.com/#get-repay-record
         * @see https://docs.kucoin.com/#query-isolated-margin-account-info
         * @param {string} code unified currency code
         * @param {string} symbol unified market symbol, required for isolated margin
         * @param {int} [since] the earliest time in ms to fetch borrrow interest for
         * @param {int} [limit] the maximum number of structures to retrieve
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {string} [params.marginMode] 'cross' or 'isolated' default is 'cross'
         * @returns {object[]} a list of [borrow interest structures]{@link https://docs.ccxt.com/#/?id=borrow-interest-structure}
         */
        await this.loadMarkets ();
        let marginMode = undefined;
        [ marginMode, params ] = this.handleMarginModeAndParams ('fetchBorrowInterest', params);
        if (marginMode === undefined) {
            marginMode = 'cross'; // cross as default marginMode
        }
        const request: Dict = {};
        let response = undefined;
        if (code !== undefined) {
            const currency = this.currency (code);
            request['quoteCurrency'] = currency['id'];
        }
        if (marginMode === 'isolated') {
            response = await this.privateGetIsolatedAccounts (this.extend (request, params));
        } else {
            response = await this.privateGetMarginAccounts (this.extend (request, params));
        }
        //
        // Cross
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "totalAssetOfQuoteCurrency": "0",
        //             "totalLiabilityOfQuoteCurrency": "0",
        //             "debtRatio": "0",
        //             "status": "EFFECTIVE",
        //             "accounts": [
        //                 {
        //                     "currency": "1INCH",
        //                     "total": "0",
        //                     "available": "0",
        //                     "hold": "0",
        //                     "liability": "0",
        //                     "maxBorrowSize": "0",
        //                     "borrowEnabled": true,
        //                     "transferInEnabled": true
        //                 }
        //             ]
        //         }
        //     }
        //
        // Isolated
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "totalConversionBalance": "0.02138647",
        //             "liabilityConversionBalance": "0.01480001",
        //             "assets": [
        //                 {
        //                     "symbol": "MANA-USDT",
        //                     "debtRatio": "0",
        //                     "status": "BORROW",
        //                     "baseAsset": {
        //                         "currency": "MANA",
        //                         "borrowEnabled": true,
        //                         "repayEnabled": true,
        //                         "transferEnabled": true,
        //                         "borrowed": "0",
        //                         "totalAsset": "0",
        //                         "available": "0",
        //                         "hold": "0",
        //                         "maxBorrowSize": "1000"
        //                     },
        //                     "quoteAsset": {
        //                         "currency": "USDT",
        //                         "borrowEnabled": true,
        //                         "repayEnabled": true,
        //                         "transferEnabled": true,
        //                         "borrowed": "0",
        //                         "totalAsset": "0",
        //                         "available": "0",
        //                         "hold": "0",
        //                         "maxBorrowSize": "50000"
        //                     }
        //                 }
        //             ]
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        const assets = (marginMode === 'isolated') ? this.safeList (data, 'assets', []) : this.safeList (data, 'accounts', []);
        return this.parseBorrowInterests (assets, undefined);
    }

    parseBorrowInterest (info: Dict, market: Market = undefined) {
        //
        // Cross
        //
        //     {
        //         "currency": "1INCH",
        //         "total": "0",
        //         "available": "0",
        //         "hold": "0",
        //         "liability": "0",
        //         "maxBorrowSize": "0",
        //         "borrowEnabled": true,
        //         "transferInEnabled": true
        //     }
        //
        // Isolated
        //
        //     {
        //         "symbol": "MANA-USDT",
        //         "debtRatio": "0",
        //         "status": "BORROW",
        //         "baseAsset": {
        //             "currency": "MANA",
        //             "borrowEnabled": true,
        //             "repayEnabled": true,
        //             "transferEnabled": true,
        //             "borrowed": "0",
        //             "totalAsset": "0",
        //             "available": "0",
        //             "hold": "0",
        //             "maxBorrowSize": "1000"
        //         },
        //         "quoteAsset": {
        //             "currency": "USDT",
        //             "borrowEnabled": true,
        //             "repayEnabled": true,
        //             "transferEnabled": true,
        //             "borrowed": "0",
        //             "totalAsset": "0",
        //             "available": "0",
        //             "hold": "0",
        //             "maxBorrowSize": "50000"
        //         }
        //     }
        //
        const marketId = this.safeString (info, 'symbol');
        const marginMode = (marketId === undefined) ? 'cross' : 'isolated';
        market = this.safeMarket (marketId, market);
        const symbol = this.safeString (market, 'symbol');
        const timestamp = this.safeInteger (info, 'createdAt');
        const isolatedBase = this.safeDict (info, 'baseAsset', {});
        let amountBorrowed = undefined;
        let interest = undefined;
        let currencyId = undefined;
        if (marginMode === 'isolated') {
            amountBorrowed = this.safeNumber (isolatedBase, 'liability');
            interest = this.safeNumber (isolatedBase, 'interest');
            currencyId = this.safeString (isolatedBase, 'currency');
        } else {
            amountBorrowed = this.safeNumber (info, 'liability');
            interest = this.safeNumber (info, 'accruedInterest');
            currencyId = this.safeString (info, 'currency');
        }
        return {
            'symbol': symbol,
            'marginMode': marginMode,
            'currency': this.safeCurrencyCode (currencyId),
            'interest': interest,
            'interestRate': this.safeNumber (info, 'dailyIntRate'),
            'amountBorrowed': amountBorrowed,
            'timestamp': timestamp,  // create time
            'datetime': this.iso8601 (timestamp),
            'info': info,
        };
    }

    async fetchBorrowRateHistories (codes = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchBorrowRateHistories
         * @description retrieves a history of a multiple currencies borrow interest rate at specific time slots, returns all currencies if no symbols passed, default is undefined
         * @see https://www.kucoin.com/docs/rest/margin-trading/margin-trading-v3-/get-cross-isolated-margin-interest-records
         * @param {string[]|undefined} codes list of unified currency codes, default is undefined
         * @param {int} [since] timestamp in ms of the earliest borrowRate, default is undefined
         * @param {int} [limit] max number of borrow rate prices to return, default is undefined
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {string} [params.marginMode] 'cross' or 'isolated' default is 'cross'
         * @param {int} [params.until] the latest time in ms to fetch entries for
         * @returns {object} a dictionary of [borrow rate structures]{@link https://docs.ccxt.com/#/?id=borrow-rate-structure} indexed by the market symbol
         */
        await this.loadMarkets ();
        const marginResult = this.handleMarginModeAndParams ('fetchBorrowRateHistories', params);
        const marginMode = this.safeString (marginResult, 0, 'cross');
        const isIsolated = (marginMode === 'isolated'); // true-isolated, false-cross
        let request: Dict = {
            'isIsolated': isIsolated,
        };
        if (since !== undefined) {
            request['startTime'] = since;
        }
        [ request, params ] = this.handleUntilOption ('endTime', request, params);
        if (limit !== undefined) {
            request['pageSize'] = limit; // default:50, min:10, max:500
        }
        const response = await this.privateGetMarginInterest (this.extend (request, params));
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "timestamp": 1710829939673,
        //             "currentPage": 1,
        //             "pageSize": 50,
        //             "totalNum": 0,
        //             "totalPage": 0,
        //             "items": [
        //                 {
        //                     "createdAt": 1697783812257,
        //                     "currency": "XMR",
        //                     "interestAmount": "0.1",
        //                     "dayRatio": "0.001"
        //                 }
        //             ]
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data');
        const rows = this.safeList (data, 'items');
        return this.parseBorrowRateHistories (rows, codes, since, limit);
    }

    async fetchBorrowRateHistory (code: string, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchBorrowRateHistory
         * @description retrieves a history of a currencies borrow interest rate at specific time slots
         * @see https://www.kucoin.com/docs/rest/margin-trading/margin-trading-v3-/get-cross-isolated-margin-interest-records
         * @param {string} code unified currency code
         * @param {int} [since] timestamp for the earliest borrow rate
         * @param {int} [limit] the maximum number of [borrow rate structures]{@link https://docs.ccxt.com/#/?id=borrow-rate-structure} to retrieve
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @param {string} [params.marginMode] 'cross' or 'isolated' default is 'cross'
         * @param {int} [params.until] the latest time in ms to fetch entries for
         * @returns {object[]} an array of [borrow rate structures]{@link https://docs.ccxt.com/#/?id=borrow-rate-structure}
         */
        await this.loadMarkets ();
        const marginResult = this.handleMarginModeAndParams ('fetchBorrowRateHistories', params);
        const marginMode = this.safeString (marginResult, 0, 'cross');
        const isIsolated = (marginMode === 'isolated'); // true-isolated, false-cross
        const currency = this.currency (code);
        let request: Dict = {
            'isIsolated': isIsolated,
            'currency': currency['id'],
        };
        if (since !== undefined) {
            request['startTime'] = since;
        }
        [ request, params ] = this.handleUntilOption ('endTime', request, params);
        if (limit !== undefined) {
            request['pageSize'] = limit; // default:50, min:10, max:500
        }
        const response = await this.privateGetMarginInterest (this.extend (request, params));
        //
        //     {
        //         "code": "200000",
        //         "data": {
        //             "timestamp": 1710829939673,
        //             "currentPage": 1,
        //             "pageSize": 50,
        //             "totalNum": 0,
        //             "totalPage": 0,
        //             "items": [
        //                 {
        //                     "createdAt": 1697783812257,
        //                     "currency": "XMR",
        //                     "interestAmount": "0.1",
        //                     "dayRatio": "0.001"
        //                 }
        //             ]
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data');
        const rows = this.safeList (data, 'items');
        return this.parseBorrowRateHistory (rows, code, since, limit);
    }

    parseBorrowRateHistories (response, codes, since, limit) {
        //
        //     [
        //         {
        //             "createdAt": 1697783812257,
        //             "currency": "XMR",
        //             "interestAmount": "0.1",
        //             "dayRatio": "0.001"
        //         }
        //     ]
        //
        const borrowRateHistories: Dict = {};
        for (let i = 0; i < response.length; i++) {
            const item = response[i];
            const code = this.safeCurrencyCode (this.safeString (item, 'currency'));
            if (codes === undefined || this.inArray (code, codes)) {
                if (!(code in borrowRateHistories)) {
                    borrowRateHistories[code] = [];
                }
                const borrowRateStructure = this.parseBorrowRate (item);
                borrowRateHistories[code].push (borrowRateStructure);
            }
        }
        const keys = Object.keys (borrowRateHistories);
        for (let i = 0; i < keys.length; i++) {
            const code = keys[i];
            borrowRateHistories[code] = this.filterByCurrencySinceLimit (borrowRateHistories[code], code, since, limit);
        }
        return borrowRateHistories;
    }

    async borrowCrossMargin (code: string, amount: number, params = {}) {
        /**
         * @method
         * @name kucoin#borrowCrossMargin
         * @description create a loan to borrow margin
         * @see https://docs.kucoin.com/#1-margin-borrowing
         * @param {string} code unified currency code of the currency to borrow
         * @param {float} amount the amount to borrow
         * @param {object} [params] extra parameters specific to the exchange API endpoints
         * @param {string} [params.timeInForce] either IOC or FOK
         * @returns {object} a [margin loan structure]{@link https://docs.ccxt.com/#/?id=margin-loan-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
            'size': this.currencyToPrecision (code, amount),
            'timeInForce': 'FOK',
        };
        const response = await this.privatePostMarginBorrow (this.extend (request, params));
        //
        //     {
        //         "success": true,
        //         "code": "200",
        //         "msg": "success",
        //         "retry": false,
        //         "data": {
        //             "orderNo": "5da6dba0f943c0c81f5d5db5",
        //             "actualSize": 10
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        return this.parseMarginLoan (data, currency);
    }

    async borrowIsolatedMargin (symbol: string, code: string, amount: number, params = {}) {
        /**
         * @method
         * @name kucoin#borrowIsolatedMargin
         * @description create a loan to borrow margin
         * @see https://docs.kucoin.com/#1-margin-borrowing
         * @param {string} symbol unified market symbol, required for isolated margin
         * @param {string} code unified currency code of the currency to borrow
         * @param {float} amount the amount to borrow
         * @param {object} [params] extra parameters specific to the exchange API endpoints
         * @param {string} [params.timeInForce] either IOC or FOK
         * @returns {object} a [margin loan structure]{@link https://docs.ccxt.com/#/?id=margin-loan-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
            'size': this.currencyToPrecision (code, amount),
            'symbol': market['id'],
            'timeInForce': 'FOK',
            'isIsolated': true,
        };
        const response = await this.privatePostMarginBorrow (this.extend (request, params));
        //
        //     {
        //         "success": true,
        //         "code": "200",
        //         "msg": "success",
        //         "retry": false,
        //         "data": {
        //             "orderNo": "5da6dba0f943c0c81f5d5db5",
        //             "actualSize": 10
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        return this.parseMarginLoan (data, currency);
    }

    async repayCrossMargin (code: string, amount, params = {}) {
        /**
         * @method
         * @name kucoin#repayCrossMargin
         * @description repay borrowed margin and interest
         * @see https://docs.kucoin.com/#2-repayment
         * @param {string} code unified currency code of the currency to repay
         * @param {float} amount the amount to repay
         * @param {object} [params] extra parameters specific to the exchange API endpoints
         * @returns {object} a [margin loan structure]{@link https://docs.ccxt.com/#/?id=margin-loan-structure}
         */
        await this.loadMarkets ();
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
            'size': this.currencyToPrecision (code, amount),
        };
        const response = await this.privatePostMarginRepay (this.extend (request, params));
        //
        //     {
        //         "success": true,
        //         "code": "200",
        //         "msg": "success",
        //         "retry": false,
        //         "data": {
        //             "orderNo": "5da6dba0f943c0c81f5d5db5",
        //             "actualSize": 10
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        return this.parseMarginLoan (data, currency);
    }

    async repayIsolatedMargin (symbol: string, code: string, amount, params = {}) {
        /**
         * @method
         * @name kucoin#repayIsolatedMargin
         * @description repay borrowed margin and interest
         * @see https://docs.kucoin.com/#2-repayment
         * @param {string} symbol unified market symbol
         * @param {string} code unified currency code of the currency to repay
         * @param {float} amount the amount to repay
         * @param {object} [params] extra parameters specific to the exchange API endpoints
         * @returns {object} a [margin loan structure]{@link https://docs.ccxt.com/#/?id=margin-loan-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const currency = this.currency (code);
        const request: Dict = {
            'currency': currency['id'],
            'size': this.currencyToPrecision (code, amount),
            'symbol': market['id'],
            'isIsolated': true,
        };
        const response = await this.privatePostMarginRepay (this.extend (request, params));
        //
        //     {
        //         "success": true,
        //         "code": "200",
        //         "msg": "success",
        //         "retry": false,
        //         "data": {
        //             "orderNo": "5da6dba0f943c0c81f5d5db5",
        //             "actualSize": 10
        //         }
        //     }
        //
        const data = this.safeDict (response, 'data', {});
        return this.parseMarginLoan (data, currency);
    }

    parseMarginLoan (info, currency: Currency = undefined) {
        //
        //     {
        //         "orderNo": "5da6dba0f943c0c81f5d5db5",
        //         "actualSize": 10
        //     }
        //
        const timestamp = this.milliseconds ();
        const currencyId = this.safeString (info, 'currency');
        return {
            'id': this.safeString (info, 'orderNo'),
            'currency': this.safeCurrencyCode (currencyId, currency),
            'amount': this.safeNumber (info, 'actualSize'),
            'symbol': undefined,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'info': info,
        };
    }

    async fetchDepositWithdrawFees (codes: Strings = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#fetchDepositWithdrawFees
         * @description fetch deposit and withdraw fees - *IMPORTANT* use fetchDepositWithdrawFee to get more in-depth info
         * @see https://docs.kucoin.com/#get-currencies
         * @param {string[]|undefined} codes list of unified currency codes
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a list of [fee structures]{@link https://docs.ccxt.com/#/?id=fee-structure}
         */
        await this.loadMarkets ();
        const response = await this.publicGetCurrencies (params);
        //
        //  [
        //      {
        //        "currency": "CSP",
        //        "name": "CSP",
        //        "fullName": "Caspian",
        //        "precision": 8,
        //        "confirms": 12,
        //        "contractAddress": "0xa6446d655a0c34bc4f05042ee88170d056cbaf45",
        //        "withdrawalMinSize": "2000",
        //        "withdrawalMinFee": "1000",
        //        "isWithdrawEnabled": true,
        //        "isDepositEnabled": true,
        //        "isMarginEnabled": false,
        //        "isDebitEnabled": false
        //      },
        //  ]
        //
        const data = this.safeList (response, 'data', []);
        return this.parseDepositWithdrawFees (data, codes, 'currency');
    }

    async setLeverage (leverage: Int, symbol: Str = undefined, params = {}) {
        /**
         * @method
         * @name kucoin#setLeverage
         * @description set the level of leverage for a market
         * @see https://www.kucoin.com/docs/rest/margin-trading/margin-trading-v3-/modify-leverage-multiplier
         * @param {string} symbol unified market symbol
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} response from the exchange
         */
        await this.loadMarkets ();
        let market = undefined;
        let marketType: Str = undefined;
        [ marketType, params ] = this.handleMarketTypeAndParams ('setLeverage', undefined, params);
        if ((symbol !== undefined) || marketType !== 'spot') {
            market = this.market (symbol);
            if (market['contract']) {
                throw new NotSupported (this.id + ' setLeverage currently supports only spot margin');
            }
        }
        let marginMode: Str = undefined;
        [ marginMode, params ] = this.handleMarginModeAndParams ('setLeverage', params);
        if (marginMode === undefined) {
            throw new ArgumentsRequired (this.id + ' setLeverage requires a marginMode parameter');
        }
        const request: Dict = {};
        if (marginMode === 'isolated' && symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' setLeverage requires a symbol parameter for isolated margin');
        }
        if (symbol !== undefined) {
            request['symbol'] = market['id'];
        }
        request['leverage'] = leverage.toString ();
        request['isIsolated'] = (marginMode === 'isolated');
        return await this.privatePostPositionUpdateUserLeverage (this.extend (request, params));
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        //
        // the v2 URL is https://openapi-v2.kucoin.com/api/v1/endpoint
        //                                ↑                 ↑
        //                                ↑                 ↑
        //
        const versions = this.safeDict (this.options, 'versions', {});
        const apiVersions = this.safeDict (versions, api, {});
        const methodVersions = this.safeDict (apiVersions, method, {});
        const defaultVersion = this.safeString (methodVersions, path, this.options['version']);
        const version = this.safeString (params, 'version', defaultVersion);
        params = this.omit (params, 'version');
        let endpoint = '/api/' + version + '/' + this.implodeParams (path, params);
        if (api === 'webExchange') {
            endpoint = '/' + this.implodeParams (path, params);
        }
        if (api === 'earn') {
            endpoint = '/api/v1/' + this.implodeParams (path, params);
        }
        const query = this.omit (params, this.extractParams (path));
        let endpart = '';
        headers = (headers !== undefined) ? headers : {};
        let url = this.urls['api'][api];
        if (!this.isEmpty (query)) {
            if ((method === 'GET') || (method === 'DELETE')) {
                endpoint += '?' + this.rawencode (query);
            } else {
                body = this.json (query);
                endpart = body;
                headers['Content-Type'] = 'application/json';
            }
        }
        url = url + endpoint;
        const isFuturePrivate = (api === 'futuresPrivate');
        const isPrivate = (api === 'private');
        const isBroker = (api === 'broker');
        const isEarn = (api === 'earn');
        if (isPrivate || isFuturePrivate || isBroker || isEarn) {
            this.checkRequiredCredentials ();
            const timestamp = this.nonce ().toString ();
            headers = this.extend ({
                'KC-API-KEY-VERSION': '2',
                'KC-API-KEY': this.apiKey,
                'KC-API-TIMESTAMP': timestamp,
            }, headers);
            const apiKeyVersion = this.safeString (headers, 'KC-API-KEY-VERSION');
            if (apiKeyVersion === '2') {
                const passphrase = this.hmac (this.encode (this.password), this.encode (this.secret), sha256, 'base64');
                headers['KC-API-PASSPHRASE'] = passphrase;
            } else {
                headers['KC-API-PASSPHRASE'] = this.password;
            }
            const payload = timestamp + method + endpoint + endpart;
            const signature = this.hmac (this.encode (payload), this.encode (this.secret), sha256, 'base64');
            headers['KC-API-SIGN'] = signature;
            let partner = this.safeDict (this.options, 'partner', {});
            partner = isFuturePrivate ? this.safeValue (partner, 'future', partner) : this.safeValue (partner, 'spot', partner);
            const partnerId = this.safeString (partner, 'id');
            const partnerSecret = this.safeString2 (partner, 'secret', 'key');
            if ((partnerId !== undefined) && (partnerSecret !== undefined)) {
                const partnerPayload = timestamp + partnerId + this.apiKey;
                const partnerSignature = this.hmac (this.encode (partnerPayload), this.encode (partnerSecret), sha256, 'base64');
                headers['KC-API-PARTNER-SIGN'] = partnerSignature;
                headers['KC-API-PARTNER'] = partnerId;
                headers['KC-API-PARTNER-VERIFY'] = 'true';
            }
            if (isBroker) {
                const brokerName = this.safeString (partner, 'name');
                if (brokerName !== undefined) {
                    headers['KC-BROKER-NAME'] = brokerName;
                }
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (!response) {
            this.throwBroadlyMatchedException (this.exceptions['broad'], body, body);
            return undefined;
        }
        //
        // bad
        //     { "code": "400100", "msg": "validation.createOrder.clientOidIsRequired" }
        // good
        //     { code: '200000', data: { ... }}
        //
        const errorCode = this.safeString (response, 'code');
        const message = this.safeString2 (response, 'msg', 'data', '');
        const feedback = this.id + ' ' + message;
        this.throwExactlyMatchedException (this.exceptions['exact'], message, feedback);
        this.throwExactlyMatchedException (this.exceptions['exact'], errorCode, feedback);
        this.throwBroadlyMatchedException (this.exceptions['broad'], body, feedback);
        if (errorCode !== '200000' && errorCode !== '200') {
            throw new ExchangeError (feedback);
        }
        return undefined;
    }
}
