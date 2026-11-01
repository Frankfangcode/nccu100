/** 以累積相位維持划水連續性；只調達賢角色姿勢，不改碰撞、朝向及鏡頭。 */
export function createDahSwim(){
 let phase=0,pitch=0,lift=0,pace=0;
 return{step({dt,swimming,moving,reduced=false}){
  const step=Math.min(.05,Math.max(0,dt)),a=1-Math.exp(-step*10);
  pace+=((moving?1:0)-pace)*a;phase+=step*(2.5+pace*3);
  pitch+=((swimming? .15+pace*.9:0)-pitch)*a;
  lift+=((swimming?.06+pace*.08:0)-lift)*a;
  return{phase,pitch,lift,stroke:reduced?.12:.25+pace*.65};
 }};
}
