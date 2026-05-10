const mysql=require('mysql2/promise');
async function f(){
  const c=await mysql.createConnection({host:'10.0.0.5',user:'admin',password:'Proyecto_Seguro2026!',database:'queuefest_dw'});
  const [r]=await c.query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE TABLE_SCHEMA="queuefest_dw" AND TABLE_NAME="dim_estado_pedido"');
  console.log('dim_estado_pedido:', r.map(x=>x.COLUMN_NAME));
  
  const [r2]=await c.query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE TABLE_SCHEMA="queuefest_dw" AND TABLE_NAME="dim_metodo_pago"');
  console.log('dim_metodo_pago:', r2.map(x=>x.COLUMN_NAME));
  c.end();
}
f();
