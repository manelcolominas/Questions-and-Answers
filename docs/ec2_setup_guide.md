### Paso 1: Crear la Base de Datos en AWS RDS (MySQL)

1.  **Ir a la consola de AWS RDS** y haz clic en "Crear base de datos".
2.  **Método de creación**: Elige "Creación estándar".
3.  **Motor**: Selecciona "MySQL".
4.  **Plantilla**: Escoge la capa gratuita ("Free tier") para empezar sin costes.
5.  **Configuración**:
    *   **Identificador de la instancia de BD**: Dale un nombre, por ejemplo, `qaa-database`.
    *   **Credenciales**: Define un nombre de usuario y una contraseña maestra. **¡Guárdalos bien, los necesitarás!**
6.  **Conectividad**:
    *   **Acceso público**: Configúralo como **"No"**. Por seguridad, la base de datos no debe ser accesible desde internet, solo desde tu instancia EC2.
    *   **Grupo de seguridad de VPC**: Elige "Crear nuevo". Dale un nombre como `rds-sg`.
7.  Haz clic en **"Crear base de datos"**. La creación tardará unos minutos.
8.  Una vez creada, ve a la pestaña "Conectividad y seguridad" y copia el **"Punto de enlace" (Endpoint)**. Este será tu `DB_HOST`.

### Paso 2: Crear la Instancia EC2 para la Aplicación

1.  **Ir a la consola de AWS EC2** y haz clic en "Lanzar instancias".
2.  **Nombre**: Dale un nombre, como `qaa-app-server`.
3.  **AMI (Imagen de máquina de Amazon)**: Selecciona "Amazon Linux 2" o "Ubuntu" (la capa gratuita es una buena opción).
4.  **Tipo de instancia**: Elige `t2.micro` (incluida en la capa gratuita).
5.  **Par de claves (key pair)**: Crea un nuevo par de claves, descárgalo y guárdalo en un lugar seguro. Lo necesitarás para conectarte a la instancia por SSH.
6.  **Configuración de red**:
    *   Haz clic en "Editar".
    *   **Grupo de seguridad**: Elige "Crear un nuevo grupo de seguridad". Dale un nombre como `ec2-sg`.
    *   **Reglas de entrada (Inbound rules)**:
        *   **SSH** (puerto 22) desde `Mi IP` (para que solo tú puedas conectarte).
        *   **HTTP** (puerto 80) desde `Cualquier lugar` (0.0.0.0/0) para que los usuarios puedan acceder a tu app.
        *   **HTTPS** (puerto 443) desde `Cualquier lugar` (0.0.0.0/0).
7.  Lanza la instancia.

### Paso 3: Configurar la Conexión entre EC2 y RDS

1.  Ve a la configuración de **Grupos de seguridad** en la consola de EC2.
2.  Selecciona el grupo de tu base de datos (`rds-sg`).
3.  Ve a "Reglas de entrada" y haz clic en "Editar reglas de entrada".
4.  Añade una nueva regla:
    *   **Tipo**: `MYSQL/Aurora` (puerto 3306).
    *   **Origen**: Busca y selecciona el grupo de seguridad de tu instancia EC2 (`ec2-sg`).
5.  Guarda los cambios. Esto permite que tu aplicación en EC2 sea la única que pueda comunicarse con la base de datos.

### Paso 4: Desplegar tu Aplicación en la Instancia EC2

1.  **Conéctate a tu instancia EC2 por SSH** usando la clave `.pem` que descargaste.
    ```bash
    ssh -i /ruta/a/tu/clave.pem ec2-user@<IP_PUBLICA_DE_TU_EC2>
    ```
2.  **Instala Node.js, npm y Git**:
    ```bash
    # Actualiza los paquetes e instala git
    sudo yum update -y
    sudo yum install -y git

    # Instala nvm (Node Version Manager) para gestionar Node.js
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    source ~/.bashrc

    # Instala la última versión LTS de Node.js
    nvm install --lts
    ```
3.  **Clona tu repositorio y prepara la aplicación**:
    ```bash
    git clone <URL_DE_TU_REPOSITORIO_GIT>
    cd Questions-and-Answers # O el nombre de tu repo
    npm install
    ```
4.  **Crea el fichero de entorno `.env`**:
    ```bash
    nano server/.env
    ```
    Añade el siguiente contenido, reemplazando los valores con tus credenciales de RDS:
    ```
    DB_HOST=<PUNTO_DE_ENLACE_DE_TU_RDS>
    DB_USER=<TU_USUARIO_MAESTRO_DE_RDS>
    DB_PASSWORD=<TU_CONTRASEÑA_MAESTRA_DE_RDS>
    DB_NAME=qaa_db
    ```
5.  **Inicia tu aplicación con PM2** (un gestor de procesos que la mantendrá corriendo):
    ```bash
    sudo npm install pm2 -g
    pm2 start server/server.js --name "qaa-app"
    ```
