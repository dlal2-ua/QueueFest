const fs = require('fs');
const { fakerES: faker } = require('@faker-js/faker'); // Usamos Faker en español

const TOTAL_RECORDS = 1000000;

// Crear streams de escritura
const usuariosStream = fs.createWriteStream('usuarios.csv');
const direccionesStream = fs.createWriteStream('direcciones.csv');

// Escribir cabeceras CSV
usuariosStream.write('id,email,password_hash,nombre,rol_id,creado_en,alias,telefono,ciudad,idioma_preferido,notificaciones_push,notificaciones_email,acepta_marketing\n');
direccionesStream.write('id,id_usuario,alias,calle,numero,piso,codigo_postal,ciudad,provincia,pais,es_predeterminada,fecha_creacion\n');

console.log('Generando 1 millón de registros. Esto tomará unos minutos...');

let i = 1;
function writeData() {
    let ok = true;
    do {
        // ─── 1. DATOS DE USUARIO ────────────────────────────────────────────────
        // Para asegurar que el email sea único y no falle el UNIQUE KEY de la BD
        const email = `usr${i}_${faker.internet.email()}`;
        const passwordHash = faker.internet.password({ length: 15 });
        const nombre = faker.person.fullName();
        const rolId = 4; // Asumiendo que 4 es el rol 'usuario' en tu tabla roles
        const creadoEn = faker.date.past({ years: 2 }).toISOString().slice(0, 19).replace('T', ' ');
        const alias = `alias_${i}_${faker.internet.userName()}`.substring(0, 49); // Límite varchar(50)
        const telefono = faker.phone.number().substring(0, 20);
        const ciudadUser = faker.location.city();
        const idioma = 'es';
        const notifPush = faker.datatype.boolean() ? 1 : 0;
        const notifEmail = faker.datatype.boolean() ? 1 : 0;
        const marketing = faker.datatype.boolean() ? 1 : 0;

        const usuarioRow = `${i},${email},${passwordHash},${nombre},${rolId},${creadoEn},${alias},${telefono},${ciudadUser},${idioma},${notifPush},${notifEmail},${marketing}\n`;

        // ─── 2. DATOS DE DIRECCIÓN ──────────────────────────────────────────────
        const dirAlias = faker.helpers.arrayElement(['Casa', 'Trabajo', 'Estudio']);
        const calle = faker.location.street();
        const numero = faker.building.buildingNumber();
        const piso = faker.helpers.arrayElement(['1A', '2B', 'Bajo', 'Atico', '']);
        const cp = faker.location.zipCode();
        const ciudadDir = faker.location.city();
        const provincia = faker.location.state();
        const pais = 'España';
        const esPredeterminada = 1; // Solo creamos una por usuario, así que es predeterminada
        const fechaCreacionDir = creadoEn;

        const direccionRow = `${i},${i},${dirAlias},${calle},${numero},${piso},${cp},${ciudadDir},${provincia},${pais},${esPredeterminada},${fechaCreacionDir}\n`;

        if (i === TOTAL_RECORDS) {
            // Última escritura
            usuariosStream.write(usuarioRow);
            direccionesStream.write(direccionRow, () => {
                console.log('¡Archivos CSV generados con éxito!');
                usuariosStream.end();
                direccionesStream.end();
            });
        } else {
            // Continuar escribiendo
            usuariosStream.write(usuarioRow);
            ok = direccionesStream.write(direccionRow);
        }
        i++;
    } while (i <= TOTAL_RECORDS && ok);

    if (i <= TOTAL_RECORDS) {
        // Si el buffer se llena, esperamos a que se vacíe para continuar
        direccionesStream.once('drain', writeData);
    }
}

writeData();