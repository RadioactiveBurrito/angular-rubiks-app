export function vector3Equals(v1: THREE.Vector3, v2: THREE.Vector3, epsilon = Number.EPSILON ) {
    return ( ( Math.abs( v1.x - v2.x ) < epsilon ) && ( Math.abs( v1.y - v2.y ) < epsilon ) && ( Math.abs( v1.z - v2.z ) < epsilon ) );
}
