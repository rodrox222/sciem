#GitHub #TIS
# Como instalar el repositorio
Para poder instalar el repositorio se debe hacer lo siguiente
Tener instalado git.
[Ir a la pagina de git](https://git-scm.com/install/windows)

Una vez teniendo instalado la herramienta de git.
Deberán ingresar a git bash y moverse en el directorio que lo desean instalar
Realizar el siguiente comando

```
git clone https://github.com/rodrox222/sciem.git 
```

Con eso tendrian el repositorio instalado
Ya con eso si quieren ingresar directamente desde vscode tendran que hacer lo sigueinte
```
cd sciem
code .
```

Esto ejecutara vscode apuntando a este directorio

---
# Como instalar docker
Debera descargar docker desde su pagina principal o desde la microsoft store
[Ir a la pagina de docker](https://docs.docker.com/desktop/setup/install/windows-install/)

Despues lo ejecutan y con eso lo tendrian
Seguido de eso les pedirá que reinicien su maquina.

Una vez reiniciado deberán ejecutar el siguiente comando

```
wsl -install
```

Ya con todo esto ya deberian tener instalado docker
Ya despues  solo ejecutan docker

---
# Como hacer correr el proyecto

Una vez en el directorio del proyecto

**/sciem**

Deberan ingresar crear las variables de entorno en el directorio raiz y otro en el directorio /api 

Para el **.env** del directorio raiz deberan copiar lo siguiente
[Codigo](https://drive.google.com/file/d/1Dtn8kuVBRAUvKBuUnWvXxmglbCGH1EY8/view?usp=drive_link)
Avisan por dm para darles acceso
Ahora para el .env  del directorio /api 
[Codigo](https://drive.google.com/file/d/1zer89_U1Dk8ObLyq9KrwNN06koE6jhoX/view?usp=drive_link)

Una vez copiado ambos deberan ejecutar lo siguiente
**Ojo deben tener docker corriendo**

```
docker compose up -d --build
```
Con eso ya pueden ir a su puerto local 4173 para ver el proyecto

Ahora para poder crear la base de datos se deben ejecutar el siguiente comando
```
docker exec -it sciem_api php artisan migrate
```

Ahora para poder poblar la base de datos se ejecuta el siguiente comando
```
docker exec -it sciem_api php artisan db:seed
```

Ahora si alguna vez cambias la estructura de la base de datos se realiza el siguiente comando
```
docker exec -it sciem_api php artisan migrate:fresh --seed
```


## Y listo ya estas listo para programar, AHORA PONTE A CHAMBEAR
 
