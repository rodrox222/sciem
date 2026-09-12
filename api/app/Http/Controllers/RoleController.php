<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    /**
     * Listar todos los roles activos para selectores en el frontend.
     */
    public function index(): JsonResponse
    {
        $roles = Role::select('id', 'nombre', 'descripcion')->get();

        return response()->json($roles);
    }
}
