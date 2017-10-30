import { mat4, vec4, vec3 } from 'gl-matrix';
import { NUM_LIGHTS } from '../scene';
import TextureBuffer from './textureBuffer';

export const MAX_LIGHTS_PER_CLUSTER = 100;

export default class ClusteredRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;
  }

	//
  updateClusters(camera, viewMatrix, scene) {
    // TODO: Update the cluster texture with the count and indices of the lights in each cluster
    // This will take some time. The math is nontrivial...
// first set the first element in each 
    for (let z = 0; z < this._zSlices; ++z) {
      for (let y = 0; y < this._ySlices; ++y) {
        for (let x = 0; x < this._xSlices; ++x) {
          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;
        }
      }
    }
    debugger
    for (let q = 0; q < NUM_LIGHTS; ++q) {
        let pos = vec3.fromValues(scene.lights[q].position[0], 
		                  scene.lights[q].position[1],
		                  scene.lights[q].position[2]);
	let posEye = vec4.fromValues(pos[0], pos[1], pos[2], 1);
	// get position of light in Eye space    
	mat4.multiply(posEye, viewMatrix, posEye);
	vec4.scale(posEye, posEye, 1/posEye[3]);
	pos = vec3.fromValues(posEye[0], posEye[1], posEye[2]); 
	let radius = scene.lights[q].radius;
       // let z1 = Zposition(0, camera); 
	let zN1 = ZNormal();
	// distance from the plane to the pos.
	let zd1 = distanceToPlane(z1, zN, pos);
    	for (let z = 0; z < this._zSlices; ++z) {
          let z2 = ZPosition(z+1, camera);
	  // zN2 should also point into the Frustrum
	  let zN2 = -ZNormal();
	  let zd2 = distanceToPlane(z2, zN2, pos);
	  let zNear = nearestTo(pos[2], z1, z2);
	  // zX counts whether the position
	  // not in between the two planes but crosses a plane
	  // zx = 0 no cross at all; zx = 1 in between zx = 2 crosses from the outside
	  let zX = 0;
	  // in between planes for sure 
	  if (zd2 > 0 && zd1 > 0) {
		   zX = 1;
	  }
	  // outside but touches plane2
	  else if ( zd2 < 0 && -zd2 < radius) {
		  zX = 2;
	  }
	  // outside but touches plane 1
	  else if (zd1 < 0 && -zd1 < radius) {
		  zX = 2;
	  }
	  z1  =    z2;
	  zN1 =  -zN2;
          zd1 =   zd2;
	  if ( zx == 0) {
		  continue;
	  }
      	  for (let y = 0; y < this._ySlices; ++y) {
             for (let x = 0; x < this._xSlices; ++x) {
                let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
                // Reset the light count to 0 for every cluster
                this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;
             }
           }
        }
    }

    this._clusterTexture.update();
  }
}
//these are planes rotate about the horizontal axis and 
// produce the ySlices
//Positive angles by the right hand rule
// -theta/2 means the y value starts off as negative for the bottom of 
// the frustrum.
function thetaHorizontalRadians(index, yslices, camera) {
	// the half angle
	 var thetaYRad_2 = toRadian(camera.fov) * 0.5;
	 var      t = index/yslices
	 return -thetaYRad_2 * (1 - t) + thetaYRad_2 * t;
}
// these are planes that rotate about the y axis and go through
// the y axis. These define the xSlices. At index 0 the 
// slices start on the left and move to the right.
function thetaVerticalRadians(index, xslices, camera) {
         var thetaYRad_2 = toRadian(camera.fov) * 0.5;
	 var tan_yMax = Math.tan(thetaYRad_2);
	 var tan_xMax = camera.aspect * tan_yMax;
	 var thetaXRad_2 = Math.atan(tan_xMax);
	 var t = index/xslices;
	 return thetaXRad_2 * ( 1 - t)  - thetaXRad_2 * t;
}
// sin, cos, tan of angle in Radians
function sinCosTan(angle) {
    var  sina = sin(angle);
    var cosa = Math.min(cos(angle), 1 - 0.00001);
    cosa     = Math.max(cosa, -1 + 0.00001);
    return vec3.fromValues( sina, cosa, sina/cosa);
} 
// ZNormal points into the frustrum for the near plane or toward -1.
function ZNormal()
{
     return vec3.fromValues(0, 0, -1);
}
// these normals are down -angles are the bottom planes
function HorizontalNormal(angleVec) 
{
     return vec3.fromValues(0, -angleVec[1], -angleVec[2]);
}
// these normals are to the right
// neg angles are planes to the right and point to the right
function VerticalNormal(angleVec) 
{
      return vec3.fromValues(angleVec[1], 0, -angleVec[0]);
}
// return one point on the plane,
// works for the planes rotated about the x axis
// returns the position on the plane. 
// z is the z coordinate that would be negative
function HorizontalPosition(anglevec, z) {
     return vec3.fromValues(0, -angleVec[2] * z, z);
}
// return one point on the plane,
// works for the planes rotated about the y axis
// returns a position on the plane. z is the z coordinate
// and it would be negative
function VerticalPosition(anglevec, z) {
      return vec3.fromValues( angleVec[2] * z, 0, z);
}
// Zposition give the z position of the camera
// returns negative z coordinates
function Zposition(index, zslices, camera) 
{
     var t = index/(zslices);
     return -camera.near * (1 - t) - camera.far * t;
}
// distanceToPlane(pp, N, op) where pp is the point on the plane, N is
// the normal and op is the other point probably off the plane. If op is
// on the same side as the normal then the distance is positive.
function distanceToPlane(pp, N, op) {
     var df = vec3.create();
     vec3.subtract(df, op, pp);
     return vec3.dot(df, N);
}
// nearestTo is the nearest distance to val
function nearestTo(val, min, max) {
     mindist = Math.abs(val - min);
     maxdist = Math.abs(val - max);
     if (mindist < maxdist) {
     	return min;
     }
     else{
     	return max;
     }
}
