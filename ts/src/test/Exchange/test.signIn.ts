
async function testSignIn (exchange) {
    const method = 'signIn';
    if (exchange.has[method]) {
        await exchange[method] ();
    }
    // we don't print "else" message, because if signIn is not supported by exchange, that doesn't need to be printed, because it is not lack/missing method, but because it is not needed
}

export default testSignIn;
