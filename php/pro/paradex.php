<?php

namespace ccxt\pro;

// PLEASE DO NOT EDIT THIS FILE, IT IS GENERATED AND WILL BE OVERWRITTEN:
// https://github.com/ccxt/ccxt/blob/master/CONTRIBUTING.md#how-to-contribute-code

use Exception; // a common import
use React\Async;
use React\Promise\PromiseInterface;

class paradex extends \ccxt\async\paradex {

    public function describe() {
        return $this->deep_extend(parent::describe(), array(
            'has' => array(
                'ws' => true,
                'watchTicker' => true,
                'watchTickers' => true,
                'watchOrderBook' => true,
                'watchOrders' => false,
                'watchTrades' => true,
                'watchTradesForSymbols' => false,
                'watchBalance' => false,
                'watchOHLCV' => false,
            ),
            'urls' => array(
                'logo' => 'https://x.com/tradeparadex/photo',
                'api' => array(
                    'ws' => 'wss://ws.api.prod.paradex.trade/v1',
                ),
                'test' => array(
                    'ws' => 'wss://ws.api.testnet.paradex.trade/v1',
                ),
                'www' => 'https://www.paradex.trade/',
                'doc' => 'https://docs.api.testnet.paradex.trade/',
                'fees' => 'https://docs.paradex.trade/getting-started/trading-fees',
                'referral' => '',
            ),
            'options' => array(),
            'streaming' => array(),
        ));
    }

    public function watch_trades(string $symbol, ?int $since = null, ?int $limit = null, $params = array ()): PromiseInterface {
        return Async\async(function () use ($symbol, $since, $limit, $params) {
            /**
             * get the list of most recent $trades for a particular $symbol
             * @see https://docs.api.testnet.paradex.trade/#sub-$trades-market_symbol-operation
             * @param {string} $symbol unified $symbol of the $market to fetch $trades for
             * @param {int} [$since] timestamp in ms of the earliest trade to fetch
             * @param {int} [$limit] the maximum amount of $trades to fetch
             * @param {array} [$params] extra parameters specific to the exchange API endpoint
             * @return {array[]} a list of ~@link https://docs.ccxt.com/#/?id=public-$trades trade structures~
             */
            Async\await($this->load_markets());
            $messageHash = 'trades.';
            if ($symbol !== null) {
                $market = $this->market($symbol);
                $messageHash .= $market['id'];
            } else {
                $messageHash .= 'ALL';
            }
            $url = $this->urls['api']['ws'];
            $request = array(
                'jsonrpc' => '2.0',
                'method' => 'subscribe',
                'params' => array(
                    'channel' => $messageHash,
                ),
            );
            $trades = Async\await($this->watch($url, $messageHash, $this->deep_extend($request, $params), $messageHash));
            if ($this->newUpdates) {
                $limit = $trades->getLimit ($symbol, $limit);
            }
            return $this->filter_by_since_limit($trades, $since, $limit, 'timestamp', true);
        }) ();
    }

    public function handle_trade(Client $client, $message) {
        //
        //     {
        //         "jsonrpc" => "2.0",
        //         "method" => "subscription",
        //         "params" => {
        //             "channel" => "trades.ALL",
        //             "data" => {
        //                 "id" => "1718179273230201709233240002",
        //                 "market" => "kBONK-USD-PERP",
        //                 "side" => "BUY",
        //                 "size" => "34028",
        //                 "price" => "0.028776",
        //                 "created_at" => 1718179273230,
        //                 "trade_type" => "FILL"
        //             }
        //         }
        //     }
        //
        $params = $this->safe_dict($message, 'params', array());
        $data = $this->safe_dict($params, 'data', array());
        $parsedTrade = $this->parse_trade($data);
        $symbol = $parsedTrade['symbol'];
        $messageHash = $this->safe_string($params, 'channel');
        $stored = $this->safe_value($this->trades, $symbol);
        if ($stored === null) {
            $stored = new ArrayCache ($this->safe_integer($this->options, 'tradesLimit', 1000));
            $this->trades[$symbol] = $stored;
        }
        $stored->append ($parsedTrade);
        $client->resolve ($stored, $messageHash);
        return $message;
    }

    public function watch_order_book(string $symbol, ?int $limit = null, $params = array ()): PromiseInterface {
        return Async\async(function () use ($symbol, $limit, $params) {
            /**
             * watches information on open orders with bid (buy) and ask (sell) prices, volumes and other data
             * @see https://docs.api.testnet.paradex.trade/#sub-order_book-market_symbol-snapshot-15-refresh_rate-operation
             * @param {string} $symbol unified $symbol of the $market to fetch the order book for
             * @param {int} [$limit] the maximum amount of order book entries to return
             * @param {array} [$params] extra parameters specific to the exchange API endpoint
             * @return {array} A dictionary of ~@link https://docs.ccxt.com/#/?id=order-book-structure order book structures~ indexed by $market symbols
             */
            Async\await($this->load_markets());
            $market = $this->market($symbol);
            $messageHash = 'order_book.' . $market['id'] . '.snapshot@15@100ms';
            $url = $this->urls['api']['ws'];
            $request = array(
                'jsonrpc' => '2.0',
                'method' => 'subscribe',
                'params' => array(
                    'channel' => $messageHash,
                ),
            );
            $orderbook = Async\await($this->watch($url, $messageHash, $this->deep_extend($request, $params), $messageHash));
            return $orderbook->limit ();
        }) ();
    }

    public function handle_order_book(Client $client, $message) {
        //
        //     {
        //         "jsonrpc" => "2.0",
        //         "method" => "subscription",
        //         "params" => {
        //             "channel" => "order_book.BTC-USD-PERP.snapshot@15@50ms",
        //             "data" => {
        //                 "seq_no" => 14127815,
        //                 "market" => "BTC-USD-PERP",
        //                 "last_updated_at" => 1718267837265,
        //                 "update_type" => "s",
        //                 "inserts" => array(
        //                     array(
        //                         "side" => "BUY",
        //                         "price" => "67629.7",
        //                         "size" => "0.992"
        //                     ),
        //                     {
        //                         "side" => "SELL",
        //                         "price" => "69378.6",
        //                         "size" => "3.137"
        //                     }
        //                 ),
        //                 "updates" => array(),
        //                 "deletes" => array()
        //             }
        //         }
        //     }
        //
        $params = $this->safe_dict($message, 'params', array());
        $data = $this->safe_dict($params, 'data', array());
        $marketId = $this->safe_string($data, 'market');
        $market = $this->safe_market($marketId);
        $timestamp = $this->safe_integer($data, 'last_updated_at');
        $symbol = $market['symbol'];
        if (!(is_array($this->orderbooks) && array_key_exists($symbol, $this->orderbooks))) {
            $this->orderbooks[$symbol] = $this->order_book();
        }
        $orderbookData = array(
            'bids' => array(),
            'asks' => array(),
        );
        $inserts = $this->safe_list($data, 'inserts');
        for ($i = 0; $i < count($inserts); $i++) {
            $insert = $this->safe_dict($inserts, $i);
            $side = $this->safe_string($insert, 'side');
            $price = $this->safe_string($insert, 'price');
            $size = $this->safe_string($insert, 'size');
            if ($side === 'BUY') {
                $orderbookData['bids'][] = array( $price, $size );
            } else {
                $orderbookData['asks'][] = array( $price, $size );
            }
        }
        $orderbook = $this->orderbooks[$symbol];
        $snapshot = $this->parse_order_book($orderbookData, $symbol, $timestamp, 'bids', 'asks');
        $snapshot['nonce'] = $this->safe_number($data, 'seq_no');
        $orderbook->reset ($snapshot);
        $messageHash = $this->safe_string($params, 'channel');
        $client->resolve ($orderbook, $messageHash);
    }

    public function watch_ticker(string $symbol, $params = array ()): PromiseInterface {
        return Async\async(function () use ($symbol, $params) {
            /**
             * watches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market
             * @see https://docs.api.testnet.paradex.trade/#sub-markets_summary-operation
             * @param {string} $symbol unified $symbol of the market to fetch the ticker for
             * @param {array} [$params] extra parameters specific to the exchange API endpoint
             * @return {array} a ~@link https://docs.ccxt.com/#/?id=ticker-structure ticker structure~
             */
            Async\await($this->load_markets());
            $symbol = $this->symbol($symbol);
            $channel = 'markets_summary';
            $url = $this->urls['api']['ws'];
            $request = array(
                'jsonrpc' => '2.0',
                'method' => 'subscribe',
                'params' => array(
                    'channel' => $channel,
                ),
            );
            $messageHash = $channel . '.' . $symbol;
            return Async\await($this->watch($url, $messageHash, $this->deep_extend($request, $params), $messageHash));
        }) ();
    }

    public function watch_tickers(?array $symbols = null, $params = array ()): PromiseInterface {
        return Async\async(function () use ($symbols, $params) {
            /**
             * watches a price ticker, a statistical calculation with the information calculated over the past 24 hours for all markets of a specific list
             * @param {string[]} $symbols unified symbol of the market to fetch the ticker for
             * @param {array} [$params] extra parameters specific to the exchange API endpoint
             * @return {array} a ~@link https://docs.ccxt.com/#/?id=ticker-structure ticker structure~
             */
            Async\await($this->load_markets());
            $symbols = $this->market_symbols($symbols);
            $channel = 'markets_summary';
            $url = $this->urls['api']['ws'];
            $request = array(
                'jsonrpc' => '2.0',
                'method' => 'subscribe',
                'params' => array(
                    'channel' => $channel,
                ),
            );
            $messageHashes = array();
            if (gettype($symbols) === 'array' && array_keys($symbols) === array_keys(array_keys($symbols))) {
                for ($i = 0; $i < count($symbols); $i++) {
                    $messageHash = $channel . '.' . $symbols[$i];
                    $messageHashes[] = $messageHash;
                }
            } else {
                $messageHashes[] = $channel;
            }
            $newTickers = Async\await($this->watch_multiple($url, $messageHashes, $this->deep_extend($request, $params), $messageHashes));
            if ($this->newUpdates) {
                $result = array();
                $result[$newTickers['symbol']] = $newTickers;
                return $result;
            }
            return $this->filter_by_array($this->tickers, 'symbol', $symbols);
        }) ();
    }

    public function handle_ticker(Client $client, $message) {
        //
        //     {
        //         "jsonrpc" => "2.0",
        //         "method" => "subscription",
        //         "params" => {
        //             "channel" => "markets_summary",
        //             "data" => {
        //                 "symbol" => "ORDI-USD-PERP",
        //                 "oracle_price" => "49.80885481",
        //                 "mark_price" => "49.80885481",
        //                 "last_traded_price" => "62.038",
        //                 "bid" => "49.822",
        //                 "ask" => "58.167",
        //                 "volume_24h" => "0",
        //                 "total_volume" => "54542628.66054200416",
        //                 "created_at" => 1718334307698,
        //                 "underlying_price" => "47.93",
        //                 "open_interest" => "6999.5",
        //                 "funding_rate" => "0.03919997509811",
        //                 "price_change_rate_24h" => ""
        //             }
        //         }
        //     }
        //
        $params = $this->safe_dict($message, 'params', array());
        $data = $this->safe_dict($params, 'data', array());
        $marketId = $this->safe_string($data, 'symbol');
        $market = $this->safe_market($marketId);
        $symbol = $market['symbol'];
        $channel = $this->safe_string($params, 'channel');
        $messageHash = $channel . '.' . $symbol;
        $ticker = $this->parse_ticker($data, $market);
        $this->tickers[$symbol] = $ticker;
        $client->resolve ($ticker, $channel);
        $client->resolve ($ticker, $messageHash);
        return $message;
    }

    public function handle_error_message(Client $client, $message) {
        //
        //     {
        //         "jsonrpc" => "2.0",
        //         "id" => 0,
        //         "error" => array(
        //             "code" => -32600,
        //             "message" => "invalid subscribe request",
        //             "data" => "invalid channel"
        //         ),
        //         "usIn" => 1718179125962419,
        //         "usDiff" => 76,
        //         "usOut" => 1718179125962495
        //     }
        //
        $error = $this->safe_dict($message, 'error');
        if ($error === null) {
            return true;
        } else {
            $errorCode = $this->safe_string($error, 'code');
            if ($errorCode !== null) {
                $feedback = $this->id . ' ' . $this->json($error);
                $this->throw_exactly_matched_exception($this->exceptions['exact'], '-32600', $feedback);
                $messageString = $this->safe_value($error, 'message');
                if ($messageString !== null) {
                    $this->throw_broadly_matched_exception($this->exceptions['broad'], $messageString, $feedback);
                }
            }
            return false;
        }
    }

    public function handle_message(Client $client, $message) {
        if (!$this->handle_error_message($client, $message)) {
            return;
        }
        //
        //     {
        //         "jsonrpc" => "2.0",
        //         "method" => "subscription",
        //         "params" => {
        //             "channel" => "trades.ALL",
        //             "data" => {
        //                 "id" => "1718179273230201709233240002",
        //                 "market" => "kBONK-USD-PERP",
        //                 "side" => "BUY",
        //                 "size" => "34028",
        //                 "price" => "0.028776",
        //                 "created_at" => 1718179273230,
        //                 "trade_type" => "FILL"
        //             }
        //         }
        //     }
        //
        $data = $this->safe_dict($message, 'params');
        if ($data !== null) {
            $channel = $this->safe_string($data, 'channel');
            $parts = explode('.', $channel);
            $name = $this->safe_string($parts, 0);
            $methods = array(
                'trades' => array($this, 'handle_trade'),
                'order_book' => array($this, 'handle_order_book'),
                'markets_summary' => array($this, 'handle_ticker'),
                // ...
            );
            $method = $this->safe_value($methods, $name);
            if ($method !== null) {
                $method($client, $message);
            }
        }
    }
}
