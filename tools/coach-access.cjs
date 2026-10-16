// Genera credenciales individuales; los códigos completos nunca van al repositorio.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
if(process.argv[2]==='--bundle'){
  const members=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../output/coach/access.json'),'utf8')),member=members.find(m=>m.member===Number(process.argv[4]||1));
  if(!member||!process.argv[3]||!/^[-\w]{32,128}$/.test(member.code)||crypto.createHash('sha256').update(member.code).digest('hex')!==member.hash)throw Error('No existe un acceso válido para esta APK.');
  fs.writeFileSync(path.join(process.argv[3],'coach-access.txt'),member.code+'\n');console.log('Acceso del grupo incluido en la APK, sin mostrar credenciales.');return;
}
const n=Number(process.argv[2]||5),dir=path.resolve(__dirname,'../output/coach'),file=path.join(dir,'access.json'),hashes=path.join(dir,'access-hashes.txt');
if(!Number.isInteger(n)||n<1||n>50)throw Error('Uso: node tools/coach-access.cjs [1..50]');
if(fs.existsSync(file)||fs.existsSync(hashes))throw Error('Ya existen códigos en output/coach. Consérvalos antes de generar otros.');
const members=Array.from({length:n},(_,i)=>{const code=crypto.randomBytes(32).toString('base64url');return {member:i+1,code,hash:crypto.createHash('sha256').update(code).digest('hex')};});
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(file,JSON.stringify(members,null,2)+'\n',{flag:'wx'});fs.writeFileSync(hashes,members.map(m=>m.hash).join(',')+'\n',{flag:'wx'});
console.log(`${n} códigos guardados en ${file}. Sus hashes están en ${hashes}. Entrega un código distinto a cada arquero.`);
