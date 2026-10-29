<?php

// Cliente de QA: no recibe secretos por argv ni los imprime.
require __DIR__.'/../vendor/autoload.php';
if (getenv('SCIEM_QA_ALLOW_WRITE') !== '1' || getenv('APP_ENV') !== 'testing') {
    fwrite(STDERR, "REFUSADO: cliente exclusivo de QA.\n");
    exit(2);
}
$input = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
$client = new GuzzleHttp\Client(['base_uri' => 'http://127.0.0.1:8200', 'http_errors' => false, 'timeout' => 20]);
$start = microtime(true);
$response = $client->request($input['method'], $input['path'], [
    'headers' => ['Accept' => 'application/json', 'Authorization' => 'Bearer '.$input['token']],
    'json' => $input['data'] ?? [],
]);
echo json_encode(['status' => $response->getStatusCode(), 'body' => json_decode((string) $response->getBody(), true), 'ms' => (microtime(true) - $start) * 1000], JSON_THROW_ON_ERROR);
