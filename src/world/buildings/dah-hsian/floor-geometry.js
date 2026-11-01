/** 保留來源樓板頂／底及真正外緣，移除拼片之間看不到的內部側面。 */
import * as THREE from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {floorSurfacePolygons,floorBoundarySegments} from './public-floor-layout.js';
export function createDahFloorGeometry(f,depth=.32){
 const shapes=floorSurfacePolygons(f).map(p=>new THREE.Shape(p.map(([x,z])=>new THREE.Vector2(x,-z))));
 const top=new THREE.ShapeGeometry(shapes);top.rotateX(-Math.PI/2);top.translate(0,depth,0);
 const bottom=top.clone();bottom.translate(0,-depth,0);
 const index=bottom.index;for(let i=0;i<index.count;i+=3){const a=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,a);}bottom.computeVertexNormals();
 const positions=[],uvs=[];
 for(const e of floorBoundarySegments(f,{includeLandingEdges:true})){
  const a=e.a,b=e.b,points=[[a[0],0,a[1]],[b[0],0,b[1]],[b[0],depth,b[1]],[a[0],depth,a[1]]];
  const dx=b[0]-a[0],dz=b[1]-a[1],outward=(-dz)*(-e.nx)+dx*(-e.nz);
  const order=outward>0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
  for(const i of order){const p=points[i];positions.push(...p);uvs.push(Math.abs(dz)<.01?p[0]:-p[2],1-p[1]);}
 }
 const sides=new THREE.BufferGeometry();sides.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));sides.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));sides.computeVertexNormals();
 const capTop=top.toNonIndexed(),capBottom=bottom.toNonIndexed(),geometry=mergeBufferGeometries([capTop,capBottom,sides],false);
 for(const g of [top,bottom,capTop,capBottom,sides])g.dispose();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
