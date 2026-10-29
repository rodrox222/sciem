<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InstantaneaLectura
{
    public function handle(Request $request, Closure $next)
    {
        return DB::transaction(function () use ($request, $next) {
            if (DB::getDriverName() === 'pgsql' && DB::transactionLevel() === 1) {
                DB::statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
            }

            return $next($request);
        });
    }
}
